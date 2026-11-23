import { beforeEach, describe, expect, it } from 'vitest';
import {
  addPendingDefect,
  getPendingDefects,
  removePendingDefect,
  removePendingDefectsForSheet,
} from './pendingDefects';

const base = {
  poleNumber: 5,
  defectId: 1,
  phaseId: null,
  dateFound: '2026-01-01',
  inspectorFind: 'Иванов И.И.',
};

describe('pendingDefects', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('хранит дефекты по localSheetId', () => {
    addPendingDefect({ ...base, localSheetId: -1 });
    addPendingDefect({ ...base, localSheetId: -1, poleNumber: 6 });
    addPendingDefect({ ...base, localSheetId: -2 });

    expect(getPendingDefects(-1)).toHaveLength(2);
    expect(getPendingDefects(-2)).toHaveLength(1);
    expect(getPendingDefects(-3)).toHaveLength(0);
  });

  it('удаляет один дефект', () => {
    const defect = addPendingDefect({ ...base, localSheetId: -1 });
    addPendingDefect({ ...base, localSheetId: -1 });

    removePendingDefect(defect.localId);

    expect(getPendingDefects(-1)).toHaveLength(1);
  });

  it('удаляет все дефекты листка', () => {
    addPendingDefect({ ...base, localSheetId: -1 });
    addPendingDefect({ ...base, localSheetId: -1 });
    addPendingDefect({ ...base, localSheetId: -2 });

    removePendingDefectsForSheet(-1);

    expect(getPendingDefects(-1)).toHaveLength(0);
    expect(getPendingDefects(-2)).toHaveLength(1);
  });
});
