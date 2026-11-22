import { act, renderHook } from '@testing-library/react';
import { useJournalFilterState } from './useJournalFilterState';

describe('useJournalFilterState', () => {
  it('считает фильтры и сбрасывает их', () => {
    const { result } = renderHook(() => useJournalFilterState());

    expect(result.current.hasFilters).toBe(false);
    expect(result.current.isGated).toBe(true);

    act(() => result.current.setStatusFilter('active'));
    expect(result.current.statusFilter).toBe('active');
    expect(result.current.hasFilters).toBe(true);

    act(() => result.current.setInspectorFilter('Иванов'));
    expect(result.current.hasFilters).toBe(true);

    act(() => result.current.resetFilters());
    expect(result.current.statusFilter).toBe('all');
    expect(result.current.inspectorFilter).toBe('');
    expect(result.current.hasFilters).toBe(false);
  });

  it('смена напряжения сбрасывает линию и ручной показ', () => {
    const { result } = renderHook(() => useJournalFilterState());

    act(() => result.current.handleShowAll());
    act(() => result.current.setLineFilter('10'));

    expect(result.current.isGated).toBe(true);
    expect(result.current.lineFilter).toBe('10');

    act(() => result.current.handleVoltageChange('2'));

    expect(result.current.voltageFilter).toBe('2');
    expect(result.current.lineFilter).toBe('');
  });

  it('считает выбранные виды дефектов фильтром', () => {
    const { result } = renderHook(() => useJournalFilterState());

    act(() => result.current.setSelectedDefectTypeIds(new Set([1, 2])));

    expect(result.current.selectedDefectTypeIds.size).toBe(2);
    expect(result.current.hasFilters).toBe(true);
  });
});
