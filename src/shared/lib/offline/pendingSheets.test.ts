import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPendingSheet,
  clearSyncedSheet,
  getPendingSheets,
  getSyncedServerId,
  markSyncedSheet,
  removePendingSheet,
} from './pendingSheets';

const params = {
  filialId: 1,
  voltageId: 10,
  lineId: 100,
  createdDate: '2026-01-01',
  createdBy: 'Иванов И.И.',
};

describe('pendingSheets', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('добавляет и удаляет офлайн-листок', () => {
    const sheet = addPendingSheet(params);

    expect(sheet.localId).toBeLessThan(0);
    expect(getPendingSheets()).toEqual([sheet]);

    removePendingSheet(sheet.localId);
    expect(getPendingSheets()).toEqual([]);
  });

  it('хранит и очищает маппинг localId → serverId', () => {
    markSyncedSheet(-10, 42);
    expect(getSyncedServerId(-10)).toBe(42);

    clearSyncedSheet(-10);
    expect(getSyncedServerId(-10)).toBeNull();
  });
});
