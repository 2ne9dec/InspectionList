import { pb } from '@/shared/lib/pocketbase/pbClient';
import { localDb, type SyncTask } from '@/shared/lib/db/localDb';
import { logger } from '@/shared/lib/logger';

const MAX_ATTEMPTS = 10;
const SYNC_PAGE_SIZE_REFS    = 500;
const SYNC_PAGE_SIZE_RECORDS = 2000;

// ─── Маппинг: локальные поля → PocketBase ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sheetToPb(sheet: any) {
  return {
    filial_id:        sheet.filialId,
    voltage_id:       sheet.voltageId,
    line_id:          sheet.lineId,
    created_date:     sheet.createdDate,
    created_by:       sheet.createdBy,
    status:           sheet.status ?? 'active',
    merged_from_ids:  sheet.mergedFromIds ?? [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function defectToPb(defect: any, sheetServerId: string) {
  return {
    sheet_id:            sheetServerId,
    pole_number:         defect.poleNumber,
    defect_id:           defect.defectId,
    phase_id:            defect.phaseId ?? null,
    date_found:          defect.dateFound,
    inspector_find:      defect.inspectorFind,
    date_fixed:          defect.dateFixed ?? null,
    inspector_fix:       defect.inspectorFix ?? null,
    is_fixed:            defect.isFixed ?? false,
    status:              defect.status ?? 'active',
    notes:               defect.notes ?? null,
    insulator_count:     defect.insulatorCount ?? null,
    span_range:          defect.spanRange ?? null,
    garland_number:      defect.garlandNumber ?? null,
    created_at_local:    defect.createdAt ?? null,
    master_conclusion:   defect.masterConclusion ?? null,
    resolution_deadline: defect.resolutionDeadline ?? null,
    master_name:         defect.masterName ?? null,
    fix_work_volume:     defect.fixWorkVolume ?? null,
  };
}

// ─── Маппинг: PocketBase → локальные поля ───────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pbToSheet(r: any) {
  return {
    serverId:       String(r.id ?? ''),
    filialId:       Number(r.filial_id ?? 0),
    voltageId:      Number(r.voltage_id ?? 0),
    lineId:         Number(r.line_id ?? 0),
    createdDate:    String(r.created_date ?? ''),
    createdBy:      String(r.created_by ?? ''),
    status:         String(r.status ?? 'active'),
    mergedFromIds:  r.merged_from_ids ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pbToDefect(r: any, sheetLocalId: number) {
  return {
    serverId:           r.id,
    sheetId:            sheetLocalId,
    poleNumber:         r.pole_number,
    defectId:           r.defect_id,
    phaseId:            r.phase_id ?? null,
    dateFound:          r.date_found,
    inspectorFind:      r.inspector_find,
    dateFixed:          r.date_fixed ?? null,
    inspectorFix:       r.inspector_fix ?? null,
    isFixed:            r.is_fixed ?? false,
    status:             r.status ?? 'active',
    notes:              r.notes ?? null,
    insulatorCount:     r.insulator_count ?? null,
    spanRange:          r.span_range ?? null,
    garlandNumber:      r.garland_number ?? null,
    createdAt:          r.created_at_local ?? null,
    masterConclusion:   r.master_conclusion ?? null,
    resolutionDeadline: r.resolution_deadline ?? null,
    masterName:         r.master_name ?? null,
    fixWorkVolume:      r.fix_work_volume ?? null,
  };
}

// ─── Синхронизация справочников ──────────────────────────────────────────────

const REFERENCE_COLLECTIONS = [
  'filials', 'voltages', 'lines', 'elements', 'defect_types', 'phases',
] as const;

async function pullReferences(): Promise<void> {
  for (const col of REFERENCE_COLLECTIONS) {
    try {
      const result = await pb.collection(col).getList(1, SYNC_PAGE_SIZE_REFS);
      const records = result.items;
      await localDb.referenceCache.put({
        key:       col,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data:      records.map((r: any) => ({ ...r, id: r.num_id ?? r.id })),
        fetchedAt: new Date().toISOString(),
      });
    } catch {
      // Если сервера нет — оставляем кеш как есть (или JSON-fallback)
    }
  }
}

// ─── Pull: сервер → Dexie ────────────────────────────────────────────────────

async function pbGetAll(collection: string): Promise<unknown[]> {
  // getFullList итерирует все страницы автоматически (SDK отправляет perPage=500
  // и делает столько запросов, сколько нужно). Сырой fetch без пагинации возвращал
  // только первые 30 записей — всё остальное считалось удалённым и стиралось локально.
  // PocketBase v0.39 compat: no sort, smaller batch, avoid skipTotal via getList
  const page1 = await pb.collection(collection).getList(1, SYNC_PAGE_SIZE_RECORDS, {});
  return page1.items;
}

async function pull(): Promise<void> {
  // 1. Листки
  try {
    const pbSheets = await pbGetAll('sheets') as ReturnType<typeof pbToSheet>[];
    logger.info(`[sync] pull: got ${pbSheets.length} sheets from server`);
    const serverSheetIds = new Set<string>();

    for (const r of pbSheets) {
      const pbRec = r as Record<string, unknown>;
      const serverId = String(pbRec['id'] ?? '');
      if (!serverId) continue;
      serverSheetIds.add(serverId);

      const existing = await localDb.sheets.where('serverId').equals(serverId).first();

      // Берём только поля, реально пришедшие с сервера (не undefined)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const serverData: Record<string, any> = { serverId };
      if (pbRec['filial_id']    !== undefined) serverData['filialId']      = Number(pbRec['filial_id']);
      if (pbRec['voltage_id']   !== undefined) serverData['voltageId']     = Number(pbRec['voltage_id']);
      if (pbRec['line_id']      !== undefined) serverData['lineId']        = Number(pbRec['line_id']);
      if (pbRec['created_date'] !== undefined) serverData['createdDate']   = String(pbRec['created_date']);
      if (pbRec['created_by']   !== undefined) serverData['createdBy']     = String(pbRec['created_by']);
      if (pbRec['status']       !== undefined) serverData['status']        = String(pbRec['status']);
      if (pbRec['merged_from_ids'] !== undefined) serverData['mergedFromIds'] = pbRec['merged_from_ids'];

      if (existing) {
        await localDb.sheets.update(existing.id, serverData);
      } else {
        const fullData = pbToSheet(r);
        await localDb.sheets.add(fullData);
      }
    }

    // Удаляем локальные листки которых больше нет на сервере
    const localSynced = await localDb.sheets.filter(s => !!s.serverId).toArray();
    for (const sheet of localSynced) {
      if (!serverSheetIds.has(sheet.serverId!)) {
        // Удаляем дефекты этого листка и сам листок
        await localDb.defectRecords.where('sheetId').equals(sheet.id!).delete();
        await localDb.sheets.delete(sheet.id!);
        logger.info(`[sync] pull: deleted sheet localId=${sheet.id} (removed from server)`);
      }
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      const pbErr = err as { status: number; data?: unknown };
      logger.error('[sync] pull sheets error, status:', pbErr.status, pbErr.data);
    } else {
      logger.warn('[sync] pull sheets offline/error:', err);
    }
  }

  // 2. Дефекты (после листков, чтобы serverId листков уже были в Dexie)
  try {
    const pbDefects = await pbGetAll('defect_records') as unknown[];
    logger.info(`[sync] pull: got ${pbDefects.length} defects from server`);
    const serverDefectIds = new Set<string>();

    for (const r of pbDefects) {
      const rec = r as { id: string; sheet_id: string };
      serverDefectIds.add(rec.id);

      const localSheet = await localDb.sheets.where('serverId').equals(rec.sheet_id).first();
      if (!localSheet) continue;

      const data = pbToDefect(r, localSheet.id);
      const existing = await localDb.defectRecords.where('serverId').equals(rec.id).first();
      if (existing) {
        await localDb.defectRecords.update(existing.id, data);
      } else {
        await localDb.defectRecords.add(data);
      }
    }

    // Удаляем локальные дефекты которых больше нет на сервере
    const localSyncedDefects = await localDb.defectRecords.filter(d => !!d.serverId).toArray();
    for (const defect of localSyncedDefects) {
      if (!serverDefectIds.has(defect.serverId!)) {
        await localDb.defectRecords.delete(defect.id!);
        logger.info(`[sync] pull: deleted defect localId=${defect.id} (removed from server)`);
      }
    }
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      const pbErr = err as { status: number; data?: unknown };
      logger.error('[sync] pull defects error, status:', pbErr.status, pbErr.data);
    } else {
      logger.warn('[sync] pull defects offline/error:', err);
    }
  }

  // Уведомляем UI об изменениях
  window.dispatchEvent(new Event('sync:complete'));
}

// ─── Push: Dexie → сервер (очередь) ─────────────────────────────────────────

function is4xxError(err: unknown): boolean {
  if (err instanceof Error) return /\b4\d\d\b/.test(err.message);
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status;
    return typeof status === 'number' && status >= 400 && status < 500;
  }
  return false;
}

async function push(): Promise<void> {
  // Порядок важен: сначала создаём листки, потом дефекты, потом удаляем
  const queue = await localDb.syncQueue.orderBy('createdAt').toArray();
  logger.info(`[sync] push: ${queue.length} tasks in queue`);

  const order = ['create:sheets', 'create:defect_records', 'update:sheets', 'update:defect_records', 'delete:defect_records', 'delete:sheets'];
  const sorted = queue.sort((a, b) => {
    const ai = order.indexOf(`${a.action}:${a.collection}`);
    const bi = order.indexOf(`${b.action}:${b.collection}`);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  for (const task of sorted) {
    // Сбрасываем застрявшие задачи (накопили MAX_ATTEMPTS от старых неудач)
    if (task.attempts >= MAX_ATTEMPTS) {
      await localDb.syncQueue.update(task.id!, { attempts: 0 });
      task.attempts = 0;
    }

    try {
      logger.info(`[sync] processing: ${task.action}:${task.collection} localId=${task.localId}`);
      await processTask(task);
      logger.info(`[sync] done: ${task.action}:${task.collection} localId=${task.localId}`);
      await localDb.syncQueue.delete(task.id!);
    } catch (err: unknown) {
      // Логируем детали ошибки для отладки
      logger.error(`[sync] FAILED: ${task.action}:${task.collection} localId=${task.localId}`, err);
      if (err && typeof err === 'object' && 'status' in err) {
        const pbErr = err as { status: number; data?: unknown; message?: string };
        logger.error(`  → status=${pbErr.status}`, pbErr.data ?? pbErr.message);
      }
      const is4xx = is4xxError(err);
      if (is4xx) {
        // Клиентская ошибка (404, 409 и т.д.) — удаляем задачу, повторять смысла нет
        await localDb.syncQueue.delete(task.id!);
      } else {
        // Сетевая ошибка — увеличиваем счётчик попыток
        await localDb.syncQueue.update(task.id!, { attempts: task.attempts + 1 });
      }
    }
  }
}

async function processTask(task: SyncTask): Promise<void> {
  const { action, collection, localId, serverId } = task;

  if (action === 'create') {
    if (collection === 'sheets') {
      const sheet = await localDb.sheets.get(localId);
      if (!sheet) return;
      if (sheet.serverId) return; // уже синхронизирован

      const created = await pb.collection('sheets').create(sheetToPb(sheet));
      await localDb.sheets.update(localId, { serverId: created.id });

    } else if (collection === 'defect_records') {
      const defect = await localDb.defectRecords.get(localId);
      if (!defect) return;
      if (defect.serverId) return;

      const localSheet = await localDb.sheets.get(defect.sheetId);
      if (!localSheet?.serverId) {
        // Листок ещё не отправлен — бросаем ошибку, попробуем позже
        throw new Error('Sheet not synced yet');
      }

      const created = await pb.collection('defect_records').create(defectToPb(defect, localSheet.serverId));
      await localDb.defectRecords.update(localId, { serverId: created.id });
    }

  } else if (action === 'update') {
    if (collection === 'sheets') {
      const sheet = await localDb.sheets.get(localId);
      if (!sheet?.serverId) return;
      await pb.collection('sheets').update(sheet.serverId, sheetToPb(sheet));

    } else if (collection === 'defect_records') {
      const defect = await localDb.defectRecords.get(localId);
      if (!defect?.serverId) return;

      const localSheet = await localDb.sheets.get(defect.sheetId);
      if (!localSheet?.serverId) return;

      await pb.collection('defect_records').update(defect.serverId, defectToPb(defect, localSheet.serverId));
    }

  } else if (action === 'delete') {
    if (!serverId) return; // нечего удалять на сервере
    const col = collection === 'sheets' ? 'sheets' : 'defect_records';
    try {
      await pb.collection(col).delete(serverId);
    } catch (err: unknown) {
      // 404 — уже удалено, считаем успехом
      if (err instanceof Error && err.message.includes('404')) return;
      throw err;
    }
  }
}

// ─── Начальная миграция: ставим в очередь записи без serverId ────────────────

async function bootstrapQueue(): Promise<void> {
  // Листки созданные до внедрения syncQueue — у них нет serverId
  const unsyncedSheets = await localDb.sheets
    .filter((s: any) => !s.serverId)
    .toArray();

  for (const sheet of unsyncedSheets) {
    const already = await localDb.syncQueue
      .where('[collection+localId]')
      .equals(['sheets', sheet.id])
      .first();
    if (!already) {
      await localDb.syncQueue.add({
        action: 'create', collection: 'sheets',
        localId: sheet.id, attempts: 0,
        createdAt: new Date().toISOString(),
      });
    } else if (already.attempts >= MAX_ATTEMPTS - 1) {
      // Сбрасываем счётчик чтобы задача не зависла навсегда
      await localDb.syncQueue.update(already.id!, { attempts: 0 });
    }
  }

  // Дефекты без serverId
  const unsyncedDefects = await localDb.defectRecords
    .filter((d: any) => !d.serverId)
    .toArray();

  for (const defect of unsyncedDefects) {
    const already = await localDb.syncQueue
      .where('[collection+localId]')
      .equals(['defect_records', defect.id])
      .first();
    if (!already) {
      await localDb.syncQueue.add({
        action: 'create', collection: 'defect_records',
        localId: defect.id, attempts: 0,
        createdAt: new Date().toISOString(),
      });
    } else if (already.attempts >= MAX_ATTEMPTS - 1) {
      await localDb.syncQueue.update(already.id!, { attempts: 0 });
    }
  }

  if (unsyncedSheets.length || unsyncedDefects.length) {
    logger.info(`[sync] bootstrapped: ${unsyncedSheets.length} sheets, ${unsyncedDefects.length} defects queued`);
  }
}

// ─── Полная синхронизация ────────────────────────────────────────────────────

let syncing = false;

async function sync(): Promise<void> {
  if (syncing) return;
  syncing = true;
  try {
    await bootstrapQueue();
    await push();
    await pull();
    await pullReferences();
    window.dispatchEvent(new Event('sync:complete'));
  } catch (err) {
    logger.error('[sync] error:', err);
  } finally {
    syncing = false;
  }
}

// Дебаунс для вызова после мутаций — чтобы не запускать sync на каждый клик
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSync(delayMs = 2000): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { sync().catch((err) => logger.error('[sync] schedule error', err)); }, delayMs);
}

export const syncService = {
  sync,
  push,
  pull,
  pullReferences,
  scheduleSync,
};
