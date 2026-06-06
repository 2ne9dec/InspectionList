import Dexie, { type Table } from 'dexie';
import type { InspectionSheet } from '@/entities/InspectionSheet';
import type { DefectRecord } from '@/entities/DefectRecord';

export class LocalDatabase extends Dexie {
  sheets!: Table<InspectionSheet>;
  defectRecords!: Table<DefectRecord>;

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
  }
}

export const localDb = new LocalDatabase();

/** Next free id for a table (mimics json-server auto-increment). */
export async function nextLocalId(table: Table<any>): Promise<number> {
  const last = await table.orderBy('id').last();
  return last ? last.id + 1 : 1;
}
