import { useCallback, useMemo } from 'react';
import {
  useGetDefectsBySheetQuery,
  getLocationKey,
  enrichDefects,
} from '@/entities/DefectRecord';
import { useGetDefectTypesQuery, useGetElementsQuery, useGetPhasesQuery } from '@/entities/InspectionLine';
import type { FixDefectSchema } from './fixDefectSlice';

interface DefectGroup {
  key: string;
  elementName: string;
  defectName: string;
  ids: number[];
  phases: string[];
  insulatorCount: number | null | undefined;
}

interface UseFixDefectGroupsParams {
  sheetId: number;
  fix: FixDefectSchema | undefined;
  selectAll: (ids: number[]) => void;
}

/** Обогащение, группировка и выбор дефектов в окне устранения. */
export function useFixDefectGroups({ sheetId, fix, selectAll }: UseFixDefectGroupsParams) {
  const { data: allDefects = [] } = useGetDefectsBySheetQuery(sheetId);
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const { data: elements = [] } = useGetElementsQuery();
  const { data: phases = [] } = useGetPhasesQuery();

  // Сортируем: элемент → дефект → фаза (алфавитно).
  const enriched = useMemo(() => {
    const targetKey = fix?.targetKey;
    if (!targetKey) return [];
    const filtered = allDefects.filter((d) => getLocationKey(d) === targetKey && !d.isFixed);
    const list = enrichDefects(filtered, defectTypes, elements, phases);
    return [...list].sort((a, b) => {
      const elCmp = (a.elementName ?? '').localeCompare(b.elementName ?? '');
      if (elCmp !== 0) return elCmp;
      const defCmp = (a.defectName ?? '').localeCompare(b.defectName ?? '');
      if (defCmp !== 0) return defCmp;
      return (a.phaseName ?? '').localeCompare(b.phaseName ?? '');
    });
  }, [allDefects, defectTypes, elements, phases, fix?.targetKey]);

  // Группируем по elementName + defectName.
  const groups = useMemo<DefectGroup[]>(() => {
    const result: DefectGroup[] = [];
    for (const d of enriched) {
      const key = `${d.elementName}||${d.defectName}`;
      const last = result[result.length - 1];
      if (last && last.key === key) {
        last.ids.push(d.id);
        if (d.phaseName) last.phases.push(d.phaseName);
        if (d.insulatorCount != null && d.insulatorCount > 0) {
          last.insulatorCount = (last.insulatorCount ?? 0) + d.insulatorCount;
        }
      } else {
        result.push({
          key,
          elementName: d.elementName,
          defectName: d.defectName,
          ids: [d.id],
          phases: d.phaseName ? [d.phaseName] : [],
          insulatorCount: d.insulatorCount,
        });
      }
    }
    return result;
  }, [enriched]);

  const allIds = useMemo(() => enriched.map((d) => d.id), [enriched]);
  const selectedSet = useMemo(() => new Set(fix?.selectedIds ?? []), [fix?.selectedIds]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));
  const selectedCount = selectedSet.size;

  const isValid = selectedCount > 0 && !!fix?.inspectorFix.trim() && !!fix?.dateFixed;

  const handleGroupToggle = useCallback((groupIds: number[]) => {
    const allGroupSelected = groupIds.every((id) => selectedSet.has(id));
    const next = new Set(selectedSet);
    if (allGroupSelected) {
      groupIds.forEach((id) => next.delete(id));
    } else {
      groupIds.forEach((id) => next.add(id));
    }
    selectAll([...next]);
  }, [selectedSet, selectAll]);

  return {
    enriched,
    groups,
    allIds,
    selectedSet,
    allSelected,
    selectedCount,
    isValid,
    handleGroupToggle,
  };
}
