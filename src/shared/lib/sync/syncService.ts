import { localDb } from '@/shared/lib/db/localDb';
import { logger } from '@/shared/lib/logger';
import { getApiUrl } from '@/shared/lib/api/apiUrl';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';

function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

// Push: local Dexie -> server (Firebird)
async function push(): Promise<void> {
  const sheets = await localDb.sheets.toArray();
  const defectRecords = await localDb.defectRecords.toArray();
  if (sheets.length === 0 && defectRecords.length === 0) return;

  const response = await fetch(`${getApiUrl()}/sync/batch`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ sheets, defectRecords }),
  });

  if (!response.ok) throw new Error(`Sync push failed: ${response.status}`);
  logger.info('[sync] push complete');
}

// Pull: server (Firebird) -> local Dexie
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

  // Upsert into Dexie (server wins)
  await localDb.transaction('rw', [localDb.sheets, localDb.defectRecords], async () => {
    for (const sheet of sheets) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await localDb.sheets.put(sheet);
    }
    for (const defect of defectRecords) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await localDb.defectRecords.put(defect);
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
