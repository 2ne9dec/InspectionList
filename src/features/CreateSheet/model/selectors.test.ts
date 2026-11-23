import type { CreateSheetSchema } from './createSheetSlice';
import {
  selectCreateSheetCreatedBy,
  selectCreateSheetCreatedDate,
  selectCreateSheetIsOpen,
  selectCreateSheetLineId,
  selectCreateSheetSearch,
  selectCreateSheetSelectedDefectTypeIds,
  selectCreateSheetVoltageId,
} from './selectors';

const filled: CreateSheetSchema = {
  voltageId: 2,
  lineId: 5,
  createdBy: 'Иванов И.И.',
  createdDate: '2026-03-04',
  isOpen: true,
  search: 'Л-1',
  selectedDefectTypeIds: [1, 2, 3],
};

describe('CreateSheet selectors', () => {
  it('возвращает значения по умолчанию при отсутствии среза', () => {
    const state = {};

    expect(selectCreateSheetIsOpen(state)).toBe(false);
    expect(selectCreateSheetVoltageId(state)).toBeNull();
    expect(selectCreateSheetLineId(state)).toBeNull();
    expect(selectCreateSheetCreatedBy(state)).toBe('');
    expect(selectCreateSheetCreatedDate(state)).toBe('');
    expect(selectCreateSheetSearch(state)).toBe('');
    expect(selectCreateSheetSelectedDefectTypeIds(state)).toEqual([]);
  });

  it('читает заполненный срез', () => {
    const state = { createSheet: filled };

    expect(selectCreateSheetIsOpen(state)).toBe(true);
    expect(selectCreateSheetVoltageId(state)).toBe(2);
    expect(selectCreateSheetLineId(state)).toBe(5);
    expect(selectCreateSheetCreatedBy(state)).toBe('Иванов И.И.');
    expect(selectCreateSheetCreatedDate(state)).toBe('2026-03-04');
    expect(selectCreateSheetSearch(state)).toBe('Л-1');
    expect(selectCreateSheetSelectedDefectTypeIds(state)).toBe(filled.selectedDefectTypeIds);
  });
});
