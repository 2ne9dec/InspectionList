import Dexie, { type Table } from 'dexie';

// Используем Record<string, any> чтобы shared-слой не зависел от entities (FSD).
// Типизация на уровне entity-апи обеспечивается на стороне вызывающего кода.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class LocalDatabase extends Dexie {
  sheets!: Table<any>;
  defectRecords!: Table<any>;

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
  return last ? (last.id as number) + 1 : 1;
}
