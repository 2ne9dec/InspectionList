import { act, renderHook } from '@testing-library/react';
import { useJournalFilterState } from './useJournalFilterState';

describe('useJournalFilterState', () => {
  it('показывает результаты сразу после выбора фильтра', () => {
    const { result } = renderHook(() => useJournalFilterState());

    // На входе журнал закрыт гейтом: видно только общее число.
    expect(result.current.hasFilters).toBe(false);
    expect(result.current.isGated).toBe(true);

    act(() => result.current.setStatusFilter('active'));
    expect(result.current.statusFilter).toBe('active');
    expect(result.current.hasFilters).toBe(true);
    expect(result.current.isGated).toBe(false);

    act(() => result.current.setSelectedDefectTypeIds(new Set([1])));
    expect(result.current.isGated).toBe(false);

    act(() => result.current.resetFilters());
    expect(result.current.statusFilter).toBe('all');
    expect(result.current.inspectorFilter).toBe('');
    expect(result.current.hasFilters).toBe(false);
    expect(result.current.isGated).toBe(true);
  });

  it('ручной показ и фильтр вместе не включают гейт', () => {
    const { result } = renderHook(() => useJournalFilterState());

    act(() => result.current.handleShowAll());
    expect(result.current.isGated).toBe(false);

    act(() => result.current.setLineFilter('10'));

    expect(result.current.lineFilter).toBe('10');
    expect(result.current.isGated).toBe(false);

    act(() => result.current.handleVoltageChange('2'));

    expect(result.current.voltageFilter).toBe('2');
    expect(result.current.lineFilter).toBe('');
    expect(result.current.isGated).toBe(false);
  });

  it('считает выбранные виды дефектов фильтром', () => {
    const { result } = renderHook(() => useJournalFilterState());

    act(() => result.current.setSelectedDefectTypeIds(new Set([1, 2])));

    expect(result.current.selectedDefectTypeIds.size).toBe(2);
    expect(result.current.hasFilters).toBe(true);
  });
});
