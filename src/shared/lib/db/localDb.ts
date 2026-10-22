import Dexie, { type Table } from 'dexie';

// Используем Record<string, any> чтобы shared-слой не зависел от entities (FSD).
// Типизация на уровне entity-апи обеспечивается на стороне вызывающего кода.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class LocalDatabase extends Dexie {
  sheets!: Table<any>;
  defectRecords!: Table<any>;
  syncQueue!: Table<SyncTask>;
  referenceCache!: Table<ReferenceCache>;

  constructor() {
    super('InspectionListDB');

    // v1 - original schema
    this.version(1).stores({
      sheets:        '++id, filialId, voltageId, lineId, createdDate, status',
      defectRecords: '++id, sheetId, poleNumber, defectId, isFixed, dateFound',
    });

    // v2 - fields added after v1. Dexie stores all object fields automatically;
    // stores() describes indexes only. upgrade() sets defaults on existing records.
    this.version(2).stores({
      sheets:        '++id, filialId, voltageId, lineId, createdDate, status',
      defectRecords: '++id, sheetId, poleNumber, defectId, isFixed, dateFound',
    }).upgrade((tx) =>
      tx.table('defectRecords').toCollection().modify((rec: Record<string, unknown>) => {
        const nullFields = [
          'notes', 'insulatorCount', 'spanRange', 'garlandNumber', 'createdAt',
          'masterConclusion', 'resolutionDeadline', 'masterName', 'fixWorkVolume',
        ];
        for (const field of nullFields) {
          if (rec[field] === undefined) rec[field] = null;
        }
      }),
    );

    // v3 - добавляем serverId (индекс для поиска по PocketBase ID),
    //       syncQueue (очередь офлайн-операций),
    //       referenceCache (кеш справочников с сервера)
    this.version(3).stores({
      sheets:         '++id, filialId, voltageId, lineId, createdDate, status, serverId',
      defectRecords:  '++id, sheetId, poleNumber, defectId, isFixed, dateFound, serverId',
      syncQueue:      '++id, [collection+localId], action, createdAt',
      referenceCache: 'key',
    });
  }
}

export const localDb = new LocalDatabase();

/** Next free id for a table (mimics json-server auto-increment). */
export async function nextLocalId(table: Table<any>): Promise<number> {
  const last = await table.orderBy('id').last();
  return last ? (last.id as number) + 1 : 1;
}

/**
 * Generates a unique ID across devices using seconds since 2024-01-01.
 * Fits in Firebird INTEGER (max 2.1B) until ~2092.
 * Monotonically increasing even if called multiple times per second.
 */
let _lastSyncId = 0;
export function generateSyncId(): number {
  const SEC_2024 = 1704067200; // 2024-01-01 00:00:00 UTC
  const ts = Math.floor(Date.now() / 1000) - SEC_2024;
  _lastSyncId = Math.max(_lastSyncId + 1, ts);
  return _lastSyncId;
}

// ─── Типы sync-очереди ───────────────────────────────────────────────────────

export type SyncAction     = 'create' | 'update' | 'delete';
export type SyncCollection = 'sheets' | 'defect_records';

/**
 * Задача в очереди синхронизации.
 * action=create|update : берём актуальное состояние из Dexie по localId
 * action=delete        : запись уже удалена из Dexie, используем serverId
 */
export interface SyncTask {
  id?: number;
  action: SyncAction;
  collection: SyncCollection;
  localId: number;
  serverId?: string;   // PocketBase record ID
  attempts: number;
  createdAt: string;
}

// ─── Тип кеша справочников ───────────────────────────────────────────────────

export interface ReferenceCache {
  key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  fetchedAt: string;
}

// ─── Хелпер добавления в очередь (с дедупликацией) ──────────────────────────

/**
 * Добавляет задачу в syncQueue.
 * Для action=update: если уже есть pending create/update для той же записи —
 * новую задачу не создаём (существующая заберёт свежее состояние из Dexie).
 */
export async function enqueueSyncTask(
  action: SyncAction,
  collection: SyncCollection,
  localId: number,
  serverId?: string,
): Promise<void> {
  if (action === 'update') {
    const existing = await localDb.syncQueue
      .where('[collection+localId]')
      .equals([collection, localId])
      .filter((t: SyncTask) => t.action === 'create' || t.action === 'update')
      .first();
    if (existing) return; // уже есть задача — не дублируем
  }

  await localDb.syncQueue.add({
    action,
    collection,
    localId,
    serverId,
    attempts: 0,
    createdAt: new Date().toISOString(),
  });
}
