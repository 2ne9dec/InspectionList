import { act, renderHook } from '@testing-library/react';
import { useDraft } from './useDraft';

const mocks = vi.hoisted(() => ({
  selectDefect: vi.fn(),
  clearDefectSelection: vi.fn(),
  setPhaseIds: vi.fn(),
  setPoleNumber: vi.fn(),
  setInsulatorCount: vi.fn(),
}));

vi.mock('./addDefectSlice', () => ({
  addDefectSlice: {
    useActions: () => mocks,
  },
}));

interface DraftProps {
  sheetId: number;
  selectedDefectId: number | null;
  poleNumber: string;
  selectedPhaseIds: number[];
}

const defaultProps: DraftProps = {
  sheetId: 7,
  selectedDefectId: null,
  poleNumber: '',
  selectedPhaseIds: [],
};

describe('useDraft', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('сохраняет черновик в localStorage при монтировании', () => {
    renderHook(() => useDraft(defaultProps));

    expect(JSON.parse(localStorage.getItem('draft_defect_7') ?? '{}')).toEqual({
      defectId: null,
      poleNumber: '',
      phaseIds: [],
    });
  });

  it('пишет изменения в черновик при обновлении значений', () => {
    const { rerender } = renderHook((props: typeof defaultProps) => useDraft(props), {
      initialProps: defaultProps,
    });

    rerender({ sheetId: 7, selectedDefectId: 5, poleNumber: '253', selectedPhaseIds: [1, 2] });

    expect(JSON.parse(localStorage.getItem('draft_defect_7') ?? '{}')).toEqual({
      defectId: 5,
      poleNumber: '253',
      phaseIds: [1, 2],
    });
  });

  it('использует отдельный ключ для каждого листка', () => {
    renderHook(() => useDraft({ ...defaultProps, sheetId: 42 }));

    expect(localStorage.getItem('draft_defect_42')).not.toBeNull();
    expect(localStorage.getItem('draft_defect_7')).toBeNull();
  });

  it('восстанавливает черновик из localStorage при монтировании', () => {
    localStorage.setItem('draft_defect_7', JSON.stringify({
      defectId: 5,
      poleNumber: 12,
      phaseIds: [1, 2],
    }));

    renderHook(() => useDraft(defaultProps));

    expect(mocks.selectDefect).toHaveBeenCalledWith(5);
    expect(mocks.setPoleNumber).toHaveBeenCalledWith('12');
    expect(mocks.setPhaseIds).toHaveBeenCalledWith([1, 2]);
  });

  it('восстанавливает только заданные поля черновика', () => {
    localStorage.setItem('draft_defect_7', JSON.stringify({ poleNumber: 12 }));

    renderHook(() => useDraft(defaultProps));

    expect(mocks.selectDefect).not.toHaveBeenCalled();
    expect(mocks.setPoleNumber).toHaveBeenCalledWith('12');
    expect(mocks.setPhaseIds).not.toHaveBeenCalled();
  });

  it('игнорирует повреждённый черновик, не падая', () => {
    localStorage.setItem('draft_defect_7', '{broken');

    expect(() => renderHook(() => useDraft(defaultProps))).not.toThrow();
    expect(mocks.selectDefect).not.toHaveBeenCalled();
    expect(mocks.setPoleNumber).not.toHaveBeenCalled();
  });

  it('handleClearDraft удаляет черновик и сбрасывает выбор', () => {
    const { result } = renderHook(() => useDraft(defaultProps));
    expect(localStorage.getItem('draft_defect_7')).not.toBeNull();

    act(() => result.current.handleClearDraft());

    expect(localStorage.getItem('draft_defect_7')).toBeNull();
    expect(mocks.clearDefectSelection).toHaveBeenCalledTimes(1);
    expect(mocks.setPhaseIds).toHaveBeenCalledWith([]);
    expect(mocks.setInsulatorCount).toHaveBeenCalledWith('');
  });
});
