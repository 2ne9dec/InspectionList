import { localDb } from '@/shared/lib/db/localDb';
import { logger } from '@/shared/lib/logger';
import { getApiUrl } from '@/shared/lib/api/apiUrl';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';

function getToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEYS.TOKEN);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

// Push: локальный Dexie -> сервер (Firebird).
// Отправляет только записи с локальными изменениями (отслеживаются через syncQueue).
// Это предотвращает перезапись данных между устройствами.
async function push(): Promise<void> {
  const allQueue = await localDb.syncQueue.toArray();
  if (allQueue.length === 0) return;

  const createUpdateQueue = allQueue.filter(t => t.action === 'create' || t.action === 'update');
  const deleteQueue       = allQueue.filter(t => t.action === 'delete');

  const sheetTasks  = createUpdateQueue.filter(t => t.collection === 'sheets');
  const defectTasks = createUpdateQueue.filter(t => t.collection === 'defect_records');

  const deletedSheetIds  = deleteQueue.filter(t => t.collection === 'sheets').map(t => t.localId);
  const deletedDefectIds = deleteQueue.filter(t => t.collection === 'defect_records').map(t => t.localId);

  // Загружаем только локально изменённые записи
  const sheets = (await Promise.all(
    sheetTasks.map(t => localDb.sheets.get(t.localId)),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  )).filter(Boolean) as any[];

  const defectRecords = (await Promise.all(
    defectTasks.map(t => localDb.defectRecords.get(t.localId)),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  )).filter(Boolean) as any[];

  const response = await fetch(`${getApiUrl()}/sync/batch`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ sheets, defectRecords, deletedSheetIds, deletedDefectIds }),
  });

  if (!response.ok) throw new Error(`Sync push failed: ${response.status}`);

  // ВАЖНО: проверяем JSON-тело ответа.
  // Сервер может вернуть HTTP 200 с { ok: false, errors: [...] } —
  // например, при ошибке прав на удаление или FK-нарушении в Firebird.
  // Если только проверять response.ok (HTTP статус), syncQueue очистится,
  // pull() восстановит удалённый лист из Firebird, и удаление «отменится».
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const body = await response.json() as {
    ok: boolean;
    errors?: Array<{ type: string; reason?: string }>;
  };
  if (!body.ok) {
    const errMsg = body.errors?.map(e => e.reason ?? e.type).join('; ') ?? 'неизвестная ошибка';
    throw new Error(`Sync push отклонён сервером: ${errMsg}`);
  }

  // Очищаем очередь только при успешном подтверждении от сервера
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  await localDb.syncQueue.bulkDelete(allQueue.map(t => t.id!));

  logger.info('[sync] push complete');
}

// Pull: сервер (Firebird) -> локальный Dexie
async function pull(): Promise<void> {
  const token = getToken();
  if (!token) {
    window.dispatchEvent(new Event('sync:complete'));
    return;
  }

  const response = await fetch(`${getApiUrl()}/sync/pull`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) throw new Error(`Sync pull failed: ${response.status}`);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const data = await response.json();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const sheets: unknown[] = data.sheets ?? [];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const defectRecords: unknown[] = data.defectRecords ?? [];

  // Читаем ожидающие удаления, чтобы не восстанавливать их из Firebird.
  // Это предотвращает ситуацию: удалил лист → push() вернулся пустым →
  // pull() скачал лист заново → лист «ожил».
  const pendingDeletes = await localDb.syncQueue.where('action').equals('delete').toArray();
  const pendingDeletedSheetIds  = new Set(
    pendingDeletes.filter(t => t.collection === 'sheets').map(t => t.localId),
  );
  const pendingDeletedDefectIds = new Set(
    pendingDeletes.filter(t => t.collection === 'defect_records').map(t => t.localId),
  );

  // Сервер авторитетен: заменяем локальные данные, но не трогаем записи из очереди удаления
  await localDb.transaction('rw', [localDb.sheets, localDb.defectRecords], async () => {
    await localDb.sheets.clear();
    await localDb.defectRecords.clear();
    for (const sheet of sheets) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      if (!pendingDeletedSheetIds.has((sheet as any).id)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await localDb.sheets.put(sheet);
      }
    }
    for (const defect of defectRecords) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
      if (!pendingDeletedDefectIds.has((defect as any).id)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await localDb.defectRecords.put(defect);
      }
    }
  });

  logger.info(`[sync] pull complete: ${sheets.length} sheets, ${defectRecords.length} defects`);
  window.dispatchEvent(new Event('sync:complete'));
}

async function pullReferences(): Promise<void> {
  window.dispatchEvent(new Event('sync:complete'));
}

let syncing = false;

async function sync(): Promise<void> {
  if (syncing) return;
  syncing = true;
  try {
    await push();
    await pull();
  } catch (err) {
    logger.error('[sync] error:', err);
    // Всё равно диспатчим sync:complete, чтобы UI не завис при ошибке
    window.dispatchEvent(new Event('sync:complete'));
    throw err;
  } finally {
    syncing = false;
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSync(delayMs = 2000): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(
    () => sync().catch(err => logger.error('[sync] schedule error', err)),
    delayMs,
  );
}

export const syncService = { sync, push, pull, pullReferences, scheduleSync };
