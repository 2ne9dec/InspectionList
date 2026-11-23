import { createSheetSlice, createSheetReducer } from './createSheetSlice';
import type { CreateSheetSchema } from './createSheetSlice';

const TODAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function init(overrides: Partial<CreateSheetSchema> = {}) {
  return { ...createSheetReducer(undefined, { type: '@@INIT' }), ...overrides };
}

describe('createSheetSlice', () => {
  it('начальное состояние: модалка закрыта, дата — сегодня', () => {
    const state = createSheetReducer(undefined, { type: '@@INIT' });

    expect(state.isOpen).toBe(false);
    expect(state.voltageId).toBeNull();
    expect(state.lineId).toBeNull();
    expect(state.createdBy).toBe('');
    expect(state.createdDate).toMatch(TODAY_RE);
    expect(state.search).toBe('');
    expect(state.selectedDefectTypeIds).toEqual([]);
  });

  it('openModal открывает модалку и обновляет дату', () => {
    const state = createSheetReducer(init({ createdDate: '2000-01-01' }), createSheetSlice.actions.openModal());

    expect(state.isOpen).toBe(true);
    expect(state.createdDate).toMatch(TODAY_RE);
  });

  it('closeModal закрывает модалку и очищает выбор линии и автора', () => {
    const state = createSheetReducer(
      init({
        isOpen: true,
        voltageId: 2,
        lineId: 5,
        createdBy: 'Иванов И.И.',
        createdDate: '2000-01-01',
      }),
      createSheetSlice.actions.closeModal(),
    );

    expect(state.isOpen).toBe(false);
    expect(state.voltageId).toBeNull();
    expect(state.lineId).toBeNull();
    expect(state.createdBy).toBe('');
    expect(state.createdDate).toMatch(TODAY_RE);
  });

  it('setVoltageId сбрасывает выбранную линию', () => {
    const state = createSheetReducer(
      init({ lineId: 5 }),
      createSheetSlice.actions.setVoltageId(3),
    );

    expect(state.voltageId).toBe(3);
    expect(state.lineId).toBeNull();
  });

  it('setLineId сохраняет линию', () => {
    const state = createSheetReducer(init(), createSheetSlice.actions.setLineId(9));

    expect(state.lineId).toBe(9);
  });

  it('setCreatedBy сохраняет автора', () => {
    expect(createSheetReducer(init(), createSheetSlice.actions.setCreatedBy('Петров П.П.')).createdBy)
      .toBe('Петров П.П.');
  });

  it('setCreatedDate сохраняет дату', () => {
    expect(createSheetReducer(init(), createSheetSlice.actions.setCreatedDate('2026-07-01')).createdDate)
      .toBe('2026-07-01');
  });

  it('setSearch сохраняет поисковую строку', () => {
    expect(createSheetReducer(init(), createSheetSlice.actions.setSearch('ВЛ 110')).search)
      .toBe('ВЛ 110');
  });

  it('setSelectedDefectTypeIds заменяет выбранные виды дефектов', () => {
    const state = createSheetReducer(
      init({ selectedDefectTypeIds: [1] }),
      createSheetSlice.actions.setSelectedDefectTypeIds([2, 3]),
    );

    expect(state.selectedDefectTypeIds).toEqual([2, 3]);
  });

  it('closeModal не очищает поиск и выбранные виды дефектов', () => {
    const state = createSheetReducer(
      init({ isOpen: true, search: 'Л-1', selectedDefectTypeIds: [1, 2] }),
      createSheetSlice.actions.closeModal(),
    );

    expect(state.search).toBe('Л-1');
    expect(state.selectedDefectTypeIds).toEqual([1, 2]);
  });
});
