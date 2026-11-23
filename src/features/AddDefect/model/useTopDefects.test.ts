import { renderHook } from '@testing-library/react';
import { makeDefect } from '@tests/factories';
import type { DefectType } from '@/entities/InspectionLine';
import { useTopDefects } from './useTopDefects';

const queryMock = vi.hoisted(() => vi.fn());

vi.mock('@/entities/DefectRecord', () => ({
  useGetDefectsBySheetQuery: (sheetId: number) => queryMock(sheetId),
}));

const defectTypes: DefectType[] = [
  { id: 1, name: 'Трещина', elementId: 10 },
  { id: 2, name: 'Скол', elementId: 10 },
  { id: 3, name: 'Загрязнение', elementId: 11 },
  { id: 4, name: 'Обрыв', elementId: 12 },
  { id: 5, name: 'Ржавчина', elementId: 12 },
  { id: 6, name: 'Перекос', elementId: 12 },
];

describe('useTopDefects', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('запрашивает дефекты нужного листка', () => {
    queryMock.mockReturnValue({ data: [] });

    renderHook(() => useTopDefects(15, defectTypes));

    expect(queryMock).toHaveBeenCalledWith(15);
  });

  it('возвращает типы дефектов по убыванию частоты', () => {
    queryMock.mockReturnValue({
      data: [
        makeDefect({ id: 1, defectId: 2 }),
        makeDefect({ id: 2, defectId: 1 }),
        makeDefect({ id: 3, defectId: 2 }),
        makeDefect({ id: 4, defectId: 3 }),
        makeDefect({ id: 5, defectId: 2 }),
        makeDefect({ id: 6, defectId: 1 }),
      ],
    });

    const { result } = renderHook(() => useTopDefects(1, defectTypes));

    expect(result.current.map((d) => d.id)).toEqual([2, 1, 3]);
  });

  it('ограничивает результат пятью типами', () => {
    queryMock.mockReturnValue({
      data: [
        makeDefect({ id: 1, defectId: 1 }),
        makeDefect({ id: 2, defectId: 1 }),
        makeDefect({ id: 3, defectId: 2 }),
        makeDefect({ id: 4, defectId: 2 }),
        makeDefect({ id: 5, defectId: 3 }),
        makeDefect({ id: 6, defectId: 3 }),
        makeDefect({ id: 7, defectId: 4 }),
        makeDefect({ id: 8, defectId: 4 }),
        makeDefect({ id: 9, defectId: 5 }),
        makeDefect({ id: 10, defectId: 5 }),
        makeDefect({ id: 11, defectId: 6 }),
        makeDefect({ id: 12, defectId: 6 }),
      ],
    });

    const { result } = renderHook(() => useTopDefects(1, defectTypes));

    expect(result.current).toHaveLength(5);
    expect(result.current.map((d) => d.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('пропускает виды дефектов, отсутствующие в справочнике', () => {
    queryMock.mockReturnValue({
      data: [
        makeDefect({ id: 1, defectId: 999 }),
        makeDefect({ id: 2, defectId: 2 }),
      ],
    });

    const { result } = renderHook(() => useTopDefects(1, defectTypes));

    expect(result.current.map((d) => d.id)).toEqual([2]);
  });

  it('возвращает пустой массив, если данных ещё нет', () => {
    queryMock.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useTopDefects(1, defectTypes));

    expect(result.current).toEqual([]);
  });

  it('возвращает пустой массив для листка без дефектов', () => {
    queryMock.mockReturnValue({ data: [] });

    const { result } = renderHook(() => useTopDefects(1, defectTypes));

    expect(result.current).toEqual([]);
  });

  it('пересчитывает результат при смене справочника', () => {
    queryMock.mockReturnValue({
      data: [makeDefect({ id: 1, defectId: 1 })],
    });

    const { result, rerender } = renderHook(
      ({ types }: { types: DefectType[] }) => useTopDefects(1, types),
      { initialProps: { types: defectTypes } },
    );

    expect(result.current.map((d) => d.name)).toEqual(['Трещина']);

    rerender({ types: [defectTypes[1]] });

    expect(result.current).toEqual([]);
  });
});
