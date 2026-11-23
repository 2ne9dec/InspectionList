import { copyDefectActions, copyDefectReducer } from './copyDefectSlice';
import type { CopyDefectSchema } from './copyDefectSlice';

function init(overrides: Partial<CopyDefectSchema> = {}) {
  return { ...copyDefectReducer(undefined, { type: '@@INIT' }), ...overrides };
}

describe('copyDefectSlice', () => {
  it('начальное состояние пустое', () => {
    expect(copyDefectReducer(undefined, { type: '@@INIT' })).toEqual({
      isOpen: false,
      sourceKey: null,
      targetPolesInput: '',
      selectedDefectIds: [],
    });
  });

  it('openModal задаёт источник и очищает цель и выбор', () => {
    const state = copyDefectReducer(
      init({ targetPolesInput: '1, 2', selectedDefectIds: [5] }),
      copyDefectActions.openModal('о:253'),
    );

    expect(state.isOpen).toBe(true);
    expect(state.sourceKey).toBe('о:253');
    expect(state.targetPolesInput).toBe('');
    expect(state.selectedDefectIds).toEqual([]);
  });

  it('closeModal полностью сбрасывает модалку', () => {
    const state = copyDefectReducer(
      init({ isOpen: true, sourceKey: 'п:250-300', targetPolesInput: '1,2', selectedDefectIds: [3] }),
      copyDefectActions.closeModal(),
    );

    expect(state).toEqual({
      isOpen: false,
      sourceKey: null,
      targetPolesInput: '',
      selectedDefectIds: [],
    });
  });

  it('setTargetPolesInput сохраняет ввод', () => {
    const state = copyDefectReducer(init(), copyDefectActions.setTargetPolesInput('10, 20'));

    expect(state.targetPolesInput).toBe('10, 20');
  });

  it('toggleDefectId добавляет и снимает id', () => {
    let state = copyDefectReducer(init(), copyDefectActions.toggleDefectId(1));
    state = copyDefectReducer(state, copyDefectActions.toggleDefectId(2));

    expect(state.selectedDefectIds).toEqual([1, 2]);

    state = copyDefectReducer(state, copyDefectActions.toggleDefectId(1));

    expect(state.selectedDefectIds).toEqual([2]);
  });

  it('selectAllDefects заменяет выбор', () => {
    const state = copyDefectReducer(
      init({ selectedDefectIds: [1] }),
      copyDefectActions.selectAllDefects([7, 8]),
    );

    expect(state.selectedDefectIds).toEqual([7, 8]);
  });

  it('clearDefectSelection сбрасывает выбор, не закрывая модалку', () => {
    const state = copyDefectReducer(
      init({ isOpen: true, selectedDefectIds: [1, 2] }),
      copyDefectActions.clearDefectSelection(),
    );

    expect(state.isOpen).toBe(true);
    expect(state.selectedDefectIds).toEqual([]);
  });
});
