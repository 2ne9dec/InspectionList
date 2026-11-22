import { useCallback, useMemo, useState } from 'react';
import type { JournalRow } from '../lib/journalRows';

/** Выбор строк журнала: только неустранённые дефекты. */
export function useJournalSelection(rows: JournalRow[]) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const selectableIds = useMemo(
    () => rows.filter((r) => !r.d.isFixed).map((r) => r.d.id),
    [rows],
  );

  const allSelected = selectableIds.length > 0
    && selectableIds.every((id) => selectedIds.has(id));

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? new Set(selectableIds) : new Set());
  }, [selectableIds]);

  const handleSelect = useCallback((id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) { next.add(id); } else { next.delete(id); }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  return {
    selectedIds,
    allSelected,
    handleSelect,
    handleSelectAll,
    clearSelection,
  };
}
