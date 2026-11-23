import { addDefectActions, addDefectReducer } from './addDefectSlice';
import type { AddDefectSchema } from './addDefectSlice';

const TODAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function init(overrides: Partial<AddDefectSchema> = {}) {
  const base = addDefectReducer(undefined, { type: '@@INIT' });
  return { ...base, ...overrides };
}

describe('addDefectSlice', () => {
  it('начальное состояние пустое, режим — опора', () => {
    const state = addDefectReducer(undefined, { type: '@@INIT' });

    expect(state).toEqual({
      selectedDefectId: null,
      selectedElementId: null,
      selectedPhaseIds: [],
      garlandNumber: '',
      poleNumber: '',
      inspector: '',
      dateFound: '',
      insulatorCount: '',
      spanRange: '',
      mode: 'pole',
      notes: '',
      isFormOpen: false,
    });
  });

  it('openForm открывает форму и ставит сегодняшнюю дату', () => {
    const state = addDefectReducer(init(), addDefectActions.openForm());

    expect(state.isFormOpen).toBe(true);
    expect(state.dateFound).toMatch(TODAY_RE);
  });

  it('resetDate обновляет дату обнаружения', () => {
    const state = addDefectReducer(init({ dateFound: '2000-01-01' }), addDefectActions.resetDate());

    expect(state.dateFound).toMatch(TODAY_RE);
  });

  it('closeForm сбрасывает выбор, но сохраняет опору и пролёт', () => {
    const state = addDefectReducer(
      init({
        isFormOpen: true,
        selectedDefectId: 5,
        selectedElementId: 2,
        selectedPhaseIds: [1],
        insulatorCount: '3',
        notes: 'текст',
        poleNumber: '253',
        spanRange: '250-300',
      }),
      addDefectActions.closeForm(),
    );

    expect(state.isFormOpen).toBe(false);
    expect(state.selectedDefectId).toBeNull();
    expect(state.selectedElementId).toBeNull();
    expect(state.selectedPhaseIds).toEqual([]);
    expect(state.insulatorCount).toBe('');
    expect(state.notes).toBe('');
    expect(state.poleNumber).toBe('253');
    expect(state.spanRange).toBe('250-300');
  });

  it('selectDefect задаёт вид и элемент и сбрасывает фазу с гирляндой', () => {
    const state = addDefectReducer(
      init({ selectedPhaseIds: [1, 2], garlandNumber: '9' }),
      addDefectActions.selectDefect({ defectId: 7, elementId: 3 }),
    );

    expect(state.selectedDefectId).toBe(7);
    expect(state.selectedElementId).toBe(3);
    expect(state.selectedPhaseIds).toEqual([]);
    expect(state.garlandNumber).toBe('');
  });

  it('clearDefectSelection очищает выбор дефекта, изоляторы и пролёт', () => {
    const state = addDefectReducer(
      init({
        selectedDefectId: 5,
        selectedElementId: 2,
        selectedPhaseIds: [1],
        garlandNumber: '4',
        insulatorCount: '3',
        spanRange: '1-2',
        poleNumber: '10',
      }),
      addDefectActions.clearDefectSelection(),
    );

    expect(state.selectedDefectId).toBeNull();
    expect(state.selectedElementId).toBeNull();
    expect(state.selectedPhaseIds).toEqual([]);
    expect(state.garlandNumber).toBe('');
    expect(state.insulatorCount).toBe('');
    expect(state.spanRange).toBe('');
    expect(state.poleNumber).toBe('10');
  });

  it('setMode меняет режим и очищает оба варианта локации', () => {
    const state = addDefectReducer(
      init({ poleNumber: '10', spanRange: '10-11' }),
      addDefectActions.setMode('span'),
    );

    expect(state.mode).toBe('span');
    expect(state.poleNumber).toBe('');
    expect(state.spanRange).toBe('');
  });

  it('setPoleNumber обновляет номер опоры', () => {
    const state = addDefectReducer(init(), addDefectActions.setPoleNumber('42'));

    expect(state.poleNumber).toBe('42');
    expect(state.mode).toBe('pole');
  });

  it('setInspector обновляет ФИО осмотрщика', () => {
    expect(addDefectReducer(init(), addDefectActions.setInspector('Петров П.П.')).inspector)
      .toBe('Петров П.П.');
  });

  it('setDateFound обновляет дату', () => {
    expect(addDefectReducer(init(), addDefectActions.setDateFound('2026-05-05')).dateFound)
      .toBe('2026-05-05');
  });

  it('setInsulatorCount обновляет количество изоляторов', () => {
    expect(addDefectReducer(init(), addDefectActions.setInsulatorCount('6')).insulatorCount)
      .toBe('6');
  });

  it('setSpanRange обновляет пролёт', () => {
    expect(addDefectReducer(init(), addDefectActions.setSpanRange('40-41')).spanRange)
      .toBe('40-41');
  });

  it('setGarlandNumber обновляет номер гирлянды', () => {
    expect(addDefectReducer(init(), addDefectActions.setGarlandNumber('2')).garlandNumber)
      .toBe('2');
  });

  it('setNotes обновляет примечание', () => {
    expect(addDefectReducer(init(), addDefectActions.setNotes('комментарий')).notes)
      .toBe('комментарий');
  });

  it('setPhaseIds сохраняет массив фаз', () => {
    const state = addDefectReducer(init(), addDefectActions.setPhaseIds([1, 3]));

    expect(state.selectedPhaseIds).toEqual([1, 3]);
  });
});
