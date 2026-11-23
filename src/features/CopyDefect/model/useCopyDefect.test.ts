import { act, renderHook } from '@testing-library/react';
import { makeDefect } from '@tests/factories';
import { useCopyDefect } from './useCopyDefect';

const mocks = vi.hoisted(() => ({
  createDefect: vi.fn(),
  toastSuccess: vi.fn(),
  toastInfo: vi.fn(),
  toastError: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('@/entities/DefectRecord', () => ({
  useCreateDefectMutation: () => [mocks.createDefect, { isLoading: false }],
}));

vi.mock('@/shared/lib/toast', () => ({
  toast: {
    success: mocks.toastSuccess,
    info: mocks.toastInfo,
    error: mocks.toastError,
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: { error: mocks.loggerError },
}));

const sourceDefects = [
  makeDefect({
    id: 1,
    poleNumber: 5,
    defectId: 1,
    phaseId: null,
    customName: null,
    insulatorCount: 2,
    garlandNumber: 3,
    dateFound: '2026-01-01',
    inspectorFind: 'Иванов',
  }),
  makeDefect({
    id: 2,
    poleNumber: 5,
    defectId: 2,
    phaseId: 1,
    customName: 'Свободный текст',
    insulatorCount: null,
    garlandNumber: null,
    dateFound: '2026-01-02',
    inspectorFind: 'Петров',
  }),
];

const baseProps = {
  sheetId: 1,
  sourceDefects,
  allDefects: sourceDefects,
  selectedIds: [1, 2],
  targetPoles: [2, 3],
  enabled: true,
  onDone: vi.fn(),
};

describe('useCopyDefect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createDefect.mockImplementation(() => ({ unwrap: () => Promise.resolve({}) }));
  });

  it('ничего не делает, если копирование недоступно', async () => {
    const { result } = renderHook(() => useCopyDefect({ ...baseProps, enabled: false }));

    await act(async () => {
      await result.current.handleCopy();
    });

    expect(mocks.createDefect).not.toHaveBeenCalled();
    expect(baseProps.onDone).not.toHaveBeenCalled();
  });

  it('копирует выбранные дефекты на все целевые опоры', async () => {
    const { result } = renderHook(() => useCopyDefect(baseProps));

    await act(async () => {
      await result.current.handleCopy();
    });

    expect(mocks.createDefect).toHaveBeenCalledTimes(4);
    expect(mocks.createDefect).toHaveBeenNthCalledWith(1, {
      sheetId: 1,
      poleNumber: 2,
      defectId: 1,
      phaseId: null,
      dateFound: '2026-01-01',
      inspectorFind: 'Иванов',
      insulatorCount: 2,
      garlandNumber: 3,
      customName: null,
    });
    expect(mocks.createDefect).toHaveBeenNthCalledWith(2, {
      sheetId: 1,
      poleNumber: 2,
      defectId: 2,
      phaseId: 1,
      dateFound: '2026-01-02',
      inspectorFind: 'Петров',
      insulatorCount: null,
      garlandNumber: null,
      customName: 'Свободный текст',
    });
    expect(mocks.createDefect).toHaveBeenNthCalledWith(3, expect.objectContaining({ poleNumber: 3, defectId: 1 }));
    expect(mocks.createDefect).toHaveBeenNthCalledWith(4, expect.objectContaining({ poleNumber: 3, defectId: 2 }));
    expect(baseProps.onDone).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Скопировано: 4 деф. × 2 оп.');
  });

  it('копирует только выбранные дефекты', async () => {
    const { result } = renderHook(() => useCopyDefect({ ...baseProps, selectedIds: [2] }));

    await act(async () => {
      await result.current.handleCopy();
    });

    expect(mocks.createDefect).toHaveBeenCalledTimes(2);
    expect(mocks.createDefect.mock.calls.map(([arg]) => arg.defectId)).toEqual([2, 2]);
  });

  it('пропускает дефекты, которые уже есть на целевой опоре', async () => {
    const allDefects = [
      ...sourceDefects,
      makeDefect({ id: 99, poleNumber: 2, defectId: 1, phaseId: null, customName: null }),
    ];
    const { result } = renderHook(() => useCopyDefect({ ...baseProps, allDefects }));

    await act(async () => {
      await result.current.handleCopy();
    });

    expect(mocks.createDefect).toHaveBeenCalledTimes(3);
    expect(mocks.createDefect).not.toHaveBeenCalledWith(expect.objectContaining({ poleNumber: 2, defectId: 1 }));
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Скопировано: 3 деф. Пропущено (уже есть): 1');
  });

  it('учитывает свободное описание при поиске дублей', async () => {
    const allDefects = [
      ...sourceDefects,
      makeDefect({ id: 99, poleNumber: 2, defectId: 2, phaseId: 1, customName: 'Другой текст' }),
    ];
    const { result } = renderHook(() => useCopyDefect({ ...baseProps, allDefects }));

    await act(async () => {
      await result.current.handleCopy();
    });

    expect(mocks.createDefect).toHaveBeenCalledWith(expect.objectContaining({
      poleNumber: 2,
      defectId: 2,
      customName: 'Свободный текст',
    }));
  });

  it('сообщает, если все выбранные дефекты уже есть на целевых опорах', async () => {
    const allDefects = [
      ...sourceDefects,
      makeDefect({ id: 98, poleNumber: 2, defectId: 1 }),
      makeDefect({ id: 99, poleNumber: 2, defectId: 2, phaseId: 1, customName: 'Свободный текст' }),
    ];
    const { result } = renderHook(() => useCopyDefect({
      ...baseProps,
      allDefects,
      targetPoles: [2],
    }));

    await act(async () => {
      await result.current.handleCopy();
    });

    expect(mocks.createDefect).not.toHaveBeenCalled();
    expect(baseProps.onDone).toHaveBeenCalledTimes(1);
    expect(mocks.toastInfo).toHaveBeenCalledWith(
      'Все выбранные дефекты уже есть на целевых опорах — ничего не добавлено',
    );
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it('логирует и показывает ошибку, не вызывая onDone', async () => {
    mocks.createDefect.mockImplementation(() => ({
      unwrap: () => Promise.reject(new Error('network')),
    }));
    const { result } = renderHook(() => useCopyDefect({ ...baseProps, targetPoles: [2] }));

    await act(async () => {
      await result.current.handleCopy();
    });

    expect(mocks.loggerError).toHaveBeenCalledWith('CopyDefect failed', expect.any(Error));
    expect(mocks.toastError).toHaveBeenCalledWith('Ошибка при копировании дефектов');
    expect(baseProps.onDone).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it('возвращает флаг загрузки мутации', () => {
    const { result } = renderHook(() => useCopyDefect(baseProps));

    expect(result.current.isLoading).toBe(false);
  });
});
