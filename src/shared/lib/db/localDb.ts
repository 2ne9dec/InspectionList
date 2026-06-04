import Dexie, { type Table } from 'dexie';
import type { InspectionSheet } from '@/entities/InspectionSheet';
import type { DefectRecord } from '@/entities/DefectRecord';

export class LocalDatabase extends Dexie {
  sheets!: Table<InspectionSheet>;
  defectRecords!: Table<DefectRecord>;

  constructor() {
    super('InspectionListDB');
    this.version(1).stores({
      sheets:        '++id, filialId, voltageId, lineId, createdDate, status',
      defectRecords: '++id, sheetId, poleNumber, defectId, isFixed, dateFound',
    });
  }
}

export const localDb = new LocalDatabase();

/** Следующий свободный id для таблицы (имитирует auto-increment json-server). */
export async function nextLocalId(table: Table<any>): Promise<number> {
  const last = await table.orderBy('id').last();
  return last ? last.id + 1 : 1;
}
