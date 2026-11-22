import { act, renderHook } from '@testing-library/react';
import { makeDefect, makeJournalRow } from '@tests/factories';
import { useJournalSelection } from './useJournalSelection';

const rows = [
  makeJournalRow({ d: makeDefect({ id: 1 }) }),
  makeJournalRow({ d: makeDefect({ id: 2 }) }),
  makeJournalRow({ d: makeDefect({ id: 3, isFixed: true }) }),
];

describe('useJournalSelection', () => {
  it('выбирает только неустранённые строки', () => {
    const { result } = renderHook(() => useJournalSelection(rows));

    act(() => result.current.handleSelectAll(true));

    expect([...result.current.selectedIds]).toEqual([1, 2]);
    expect(result.current.allSelected).toBe(true);
  });

  it('переключает отдельную строку и снимает выбор', () => {
    const { result } = renderHook(() => useJournalSelection(rows));

    act(() => result.current.handleSelect(1, true));
    expect(result.current.selectedIds.has(1)).toBe(true);
    expect(result.current.allSelected).toBe(false);

    act(() => result.current.handleSelect(1, false));
    expect(result.current.selectedIds.has(1)).toBe(false);

    act(() => result.current.handleSelectAll(true));
    act(() => result.current.clearSelection());
    expect(result.current.selectedIds.size).toBe(0);
  });
});
