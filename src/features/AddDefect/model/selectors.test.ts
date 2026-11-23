import type { AddDefectSchema } from './addDefectSlice';
import {
  selectAddDefectDate,
  selectAddDefectElementId,
  selectAddDefectGarlandNumber,
  selectAddDefectInspector,
  selectAddDefectInsulatorCount,
  selectAddDefectIsFormOpen,
  selectAddDefectMode,
  selectAddDefectNotes,
  selectAddDefectPhaseIds,
  selectAddDefectPole,
  selectAddDefectSelectedId,
  selectAddDefectSpanRange,
} from './selectors';

const filled: AddDefectSchema = {
  selectedDefectId: 12,
  selectedElementId: 3,
  selectedPhaseIds: [1, 2],
  garlandNumber: '7',
  poleNumber: '253',
  inspector: 'Иванов И.И.',
  dateFound: '2026-02-03',
  insulatorCount: '4',
  spanRange: '250-300',
  mode: 'span',
  notes: 'примечание',
  isFormOpen: true,
};

describe('AddDefect selectors', () => {
  it('возвращает значения по умолчанию при отсутствии среза', () => {
    const state = {};

    expect(selectAddDefectSelectedId(state)).toBeNull();
    expect(selectAddDefectElementId(state)).toBeNull();
    expect(selectAddDefectPhaseIds(state)).toEqual([]);
    expect(selectAddDefectPole(state)).toBe('');
    expect(selectAddDefectInspector(state)).toBe('');
    expect(selectAddDefectDate(state)).toBe('');
    expect(selectAddDefectIsFormOpen(state)).toBe(false);
    expect(selectAddDefectInsulatorCount(state)).toBe('');
    expect(selectAddDefectSpanRange(state)).toBe('');
    expect(selectAddDefectGarlandNumber(state)).toBe('');
    expect(selectAddDefectMode(state)).toBe('pole');
    expect(selectAddDefectNotes(state)).toBe('');
  });

  it('читает заполненный срез', () => {
    const state = { addDefect: filled };

    expect(selectAddDefectSelectedId(state)).toBe(12);
    expect(selectAddDefectElementId(state)).toBe(3);
    expect(selectAddDefectPhaseIds(state)).toBe(filled.selectedPhaseIds);
    expect(selectAddDefectPole(state)).toBe('253');
    expect(selectAddDefectInspector(state)).toBe('Иванов И.И.');
    expect(selectAddDefectDate(state)).toBe('2026-02-03');
    expect(selectAddDefectIsFormOpen(state)).toBe(true);
    expect(selectAddDefectInsulatorCount(state)).toBe('4');
    expect(selectAddDefectSpanRange(state)).toBe('250-300');
    expect(selectAddDefectGarlandNumber(state)).toBe('7');
    expect(selectAddDefectMode(state)).toBe('span');
    expect(selectAddDefectNotes(state)).toBe('примечание');
  });

  it('не подменяет null-значения значениями по умолчанию', () => {
    const state = {
      addDefect: { ...filled, selectedDefectId: null, selectedElementId: null },
    };

    expect(selectAddDefectSelectedId(state)).toBeNull();
    expect(selectAddDefectElementId(state)).toBeNull();
  });
});
