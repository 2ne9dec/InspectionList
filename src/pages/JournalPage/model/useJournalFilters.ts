import { useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useGetAllDefectsQuery } from '@/entities/DefectRecord';
import { useGetSheetsQuery } from '@/entities/InspectionSheet';
import {
  useGetDefectTypesQuery,
  useGetElementsQuery,
  useGetPhasesQuery,
  useGetLinesQuery,
  useGetVoltagesQuery,
  useGetFilialVoltageFilterQuery,
  useGetFilialsQuery,
} from '@/entities/InspectionLine';
import { getUserEffectiveFilialId } from '@/entities/User';
import { buildJournalRows } from '../lib/journalRows';
import type { JournalRow, JournalStatusFilter } from '../lib/journalRows';
import { useJournalFilterState } from './useJournalFilterState';
import { useJournalSelection } from './useJournalSelection';

export type StatusFilter = JournalStatusFilter;

export type { JournalRow } from '../lib/journalRows';

/**
 * Управляет состоянием фильтров, вычисляет строки таблицы и выбором строк.
 * UI-компонент получает готовые rows и коллбэки — сам ничего не считает.
 */
export function useJournalFilters() {
  // Свой филиал или выбранный в переключателе (наблюдатель РУП)
  const userFilialId = useSelector(getUserEffectiveFilialId);

  const { data: defects     = [] } = useGetAllDefectsQuery();
  const { data: sheets      = [] } = useGetSheetsQuery({})  // no date filter: load all sheets;
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const { data: elements    = [] } = useGetElementsQuery();
  const { data: phases      = [] } = useGetPhasesQuery();
  const { data: lines       = [] } = useGetLinesQuery();
  const { data: voltages    = [] } = useGetVoltagesQuery();
  const { data: filialVoltageMap = {} } = useGetFilialVoltageFilterQuery();
  const { data: filials = [] } = useGetFilialsQuery();
  const filialNameMap = useMemo(() => new Map(filials.map((f) => [f.id, f.name])), [filials]);

  const filters = useJournalFilterState();
  const { handleVoltageChange } = filters;

  // При смене филиала старые напряжение и линия могут стать недопустимыми.
  const prevFilialRef = useRef(userFilialId);
  useEffect(() => {
    if (prevFilialRef.current === userFilialId) return;
    prevFilialRef.current = userFilialId;
    handleVoltageChange('');
  }, [userFilialId, handleVoltageChange]);

  // ── Листки текущего филиала ────────────────────────────────────────────────
  const filialSheets = useMemo(
    () => userFilialId === null
      ? sheets
      : sheets.filter((s) => s.filialId === userFilialId),
    [sheets, userFilialId],
  );

  // Напряжения филиала: только его классы и только разрешённые фильтром
  const filialVoltageIds = useMemo(() => {
    if (userFilialId === null) return null;
    const allowed = filialVoltageMap[String(userFilialId)];
    const ids = voltages
      .filter((v) => v.filialId === userFilialId && (!allowed || allowed.includes(v.id)))
      .map((v) => v.id);
    return new Set<number>(ids);
  }, [filialVoltageMap, userFilialId, voltages]);

  const filialVoltages = useMemo(
    () => filialVoltageIds === null
      ? voltages
      : voltages.filter((v) => filialVoltageIds.has(v.id)),
    [voltages, filialVoltageIds],
  );

  const filialLines = useMemo(
    () => filialVoltageIds === null
      ? lines
      : lines.filter((l) => l.filialId === userFilialId && filialVoltageIds.has(l.voltageId)),
    [lines, filialVoltageIds, userFilialId],
  );

  const sheetMap      = useMemo(() => new Map(filialSheets.map((s) => [s.id, s])),  [filialSheets]);
  const defectTypeMap = useMemo(() => new Map(defectTypes.map((d) => [d.id, d])),   [defectTypes]);
  const elementMap    = useMemo(() => new Map(elements.map((e) => [e.id, e])),       [elements]);
  const phaseMap      = useMemo(() => new Map(phases.map((p) => [p.id, p])),         [phases]);
  const lineMap       = useMemo(() => new Map(lines.map((l) => [l.id, l])),         [lines]);
  const voltageMap    = useMemo(() => new Map(voltages.map((v) => [v.id, v])),       [voltages]);

  const filteredLines = useMemo(() => {
    if (!filters.voltageFilter) return filialLines;
    return filialLines.filter((l) => String(l.voltageId) === filters.voltageFilter);
  }, [filialLines, filters.voltageFilter]);

  const rows = useMemo<JournalRow[]>(
    () => buildJournalRows(
      defects,
      { sheetMap, defectTypeMap, elementMap, phaseMap, lineMap, voltageMap, filialNameMap },
      {
        statusFilter: filters.statusFilter,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        voltageFilter: filters.voltageFilter,
        lineFilter: filters.lineFilter,
        selectedDefectTypeIds: filters.selectedDefectTypeIds,
        inspectorFilter: filters.inspectorFilter,
        poleFilter: filters.poleFilter,
      },
    ),
    [
      defects, filters.statusFilter, filters.dateFrom, filters.dateTo, filters.voltageFilter,
      filters.lineFilter, filters.selectedDefectTypeIds, filters.inspectorFilter, filters.poleFilter,
      sheetMap, defectTypeMap, elementMap, phaseMap, lineMap, voltageMap, filialNameMap,
    ],
  );

  const selection = useJournalSelection(rows);

  const filialDefectCount = useMemo(
    () => defects.filter((d) => sheetMap.has(d.sheetId)).length,
    [defects, sheetMap],
  );

  return {
    defects,
    elements,
    defectTypes,
    filialDefectCount,
    voltages: filialVoltages,
    filteredLines,
    rows,
    ...selection,
    ...filters,
  };
}
