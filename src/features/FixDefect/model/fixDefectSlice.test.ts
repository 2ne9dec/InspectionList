import { fixDefectActions, fixDefectReducer } from './fixDefectSlice';
import type { FixDefectSchema } from './fixDefectSlice';

const TODAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function init(overrides: Partial<FixDefectSchema> = {}) {
  return { ...fixDefectReducer(undefined, { type: '@@INIT' }), ...overrides };
}

describe('fixDefectSlice', () => {
  it('начальное состояние: модалка закрыта, дата — сегодня', () => {
    const state = fixDefectReducer(undefined, { type: '@@INIT' });

    expect(state.isOpen).toBe(false);
    expect(state.targetKey).toBeNull();
    expect(state.selectedIds).toEqual([]);
    expect(state.dateFixed).toMatch(TODAY_RE);
    expect(state.inspectorFix).toBe('');
  });

  it('openModal задаёт ключ группы, очищает выбор и обновляет дату', () => {
    const state = fixDefectReducer(
      init({ selectedIds: [1, 2], dateFixed: '2000-01-01' }),
      fixDefectActions.openModal('о:253'),
    );

    expect(state.isOpen).toBe(true);
    expect(state.targetKey).toBe('о:253');
    expect(state.selectedIds).toEqual([]);
    expect(state.dateFixed).toMatch(TODAY_RE);
  });

  it('closeModal очищает выбор и ФИО, но сохраняет дату', () => {
    const state = fixDefectReducer(
      init({ isOpen: true, targetKey: 'п:250-300', selectedIds: [1], inspectorFix: 'Иванов', dateFixed: '2026-04-01' }),
      fixDefectActions.closeModal(),
    );

    expect(state.isOpen).toBe(false);
    expect(state.targetKey).toBeNull();
    expect(state.selectedIds).toEqual([]);
    expect(state.inspectorFix).toBe('');
    expect(state.dateFixed).toBe('2026-04-01');
  });

  it('toggleId добавляет и снимает id', () => {
    let state = fixDefectReducer(init(), fixDefectActions.toggleId(10));
    state = fixDefectReducer(state, fixDefectActions.toggleId(20));

    expect(state.selectedIds).toEqual([10, 20]);

    state = fixDefectReducer(state, fixDefectActions.toggleId(10));

    expect(state.selectedIds).toEqual([20]);
  });

  it('selectAll заменяет выбранные id', () => {
    const state = fixDefectReducer(init({ selectedIds: [1] }), fixDefectActions.selectAll([2, 3]));

    expect(state.selectedIds).toEqual([2, 3]);
  });

  it('clearAll сбрасывает выбор', () => {
    const state = fixDefectReducer(init({ selectedIds: [1, 2] }), fixDefectActions.clearAll());

    expect(state.selectedIds).toEqual([]);
  });

  it('setDateFixed сохраняет дату устранения', () => {
    expect(fixDefectReducer(init(), fixDefectActions.setDateFixed('2026-06-01')).dateFixed)
      .toBe('2026-06-01');
  });

  it('setInspectorFix сохраняет ФИО устранившего', () => {
    expect(fixDefectReducer(init(), fixDefectActions.setInspectorFix('Сидоров С.С.')).inspectorFix)
      .toBe('Сидоров С.С.');
  });

  it('закрытие сбрасывает выбранные id, но не дату и не ФИО', () => {
    const state = fixDefectReducer(
      init({ isOpen: true, selectedIds: [1], dateFixed: '2026-06-01', inspectorFix: 'Сидоров' }),
      fixDefectActions.closeModal(),
    );

    expect(state.selectedIds).toEqual([]);
    expect(state.dateFixed).toBe('2026-06-01');
    expect(state.inspectorFix).toBe('');
  });
});
