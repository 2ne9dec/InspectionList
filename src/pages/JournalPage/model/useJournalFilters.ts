import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { DefectRecord } from '@/entities/DefectRecord';
import { useGetAllDefectsQuery } from '@/entities/DefectRecord';
import { useGetSheetsQuery } from '@/entities/InspectionSheet';
import type { Line, Voltage } from '@/entities/InspectionLine';
import {
  useGetDefectTypesQuery,
  useGetElementsQuery,
  useGetPhasesQuery,
  useGetLinesQuery,
  useGetVoltagesQuery,
  useGetFilialVoltageFilterQuery,
} from '@/entities/InspectionLine';
import { getUserFilialId } from '@/entities/User';

export type StatusFilter = 'all' | 'active' | 'fixed';

export interface JournalRow {
  d: DefectRecord;
  line: Line | undefined;
  voltage: Voltage | undefined;
  location: string;
}

/**
 * Управляет состоянием фильтров, вычисляет строки таблицы и выбором строк.
 * UI-компонент получает готовые rows и коллбэки — сам ничего не считает.
 */

// -- Helpers for pole/span filter
function parsePoleFilter(filter: string): { min: number; max: number } | null {
  const f = filter.trim();
  if (!f) return null;
  const range = f.match(/^(\d+)\s*[\-\u2013]\s*(\d+)$/);
  if (range) return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
  const single = f.match(/^(\d+)$/);
  if (single) { const n = parseInt(single[1], 10); return { min: n, max: n }; }
  return null;
}

function matchesSpanRange(spanRange: string | null | undefined, min: number, max: number): boolean {
  if (!spanRange) return false;
  const rangeM = spanRange.match(/^(\d+)\s*[\-\u2013]\s*(\d+)$/);
  if (rangeM) {
    const sMin = parseInt(rangeM[1], 10);
    const sMax = parseInt(rangeM[2], 10);
    return sMin <= max && sMax >= min;
  }
  const singleM = spanRange.match(/^(\d+)$/);
  if (singleM) { const n = parseInt(singleM[1], 10); return n >= min && n <= max; }
  return false;
}
export function useJournalFilters() {
  const userFilialId = useSelector(getUserFilialId);

  const { data: defects     = [] } = useGetAllDefectsQuery();
  const { data: sheets      = [] } = useGetSheetsQuery({})  // no date filter: load all sheets;
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const { data: elements    = [] } = useGetElementsQuery();
  const { data: phases      = [] } = useGetPhasesQuery();
  const { data: lines       = [] } = useGetLinesQuery();
  const { data: voltages    = [] } = useGetVoltagesQuery();
  const { data: filialVoltageMap = {} } = useGetFilialVoltageFilterQuery();

  // ── Фильтры ────────────────────────────────────────────────────────────────────────
  const [statusFilter,          setStatusFilter]          = useState<StatusFilter>('all');
  const [voltageFilter,         setVoltageFilter]         = useState('');
  const [lineFilter,            setLineFilter]            = useState('');
  const [selectedDefectTypeIds, setSelectedDefectTypeIds] = useState<Set<number>>(new Set());
  const [inspectorFilter,       setInspectorFilter]       = useState('');
  const [dateFrom,              setDateFrom]              = useState('');
  const [dateTo,                setDateTo]                = useState('');
  const [poleFilter,            setPoleFilter]            = useState('');

  // ── Выбор строк ────────────────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── Ручное снятие «ворот» ──────────────────────────────────────────────────────────────────
  const [showAll, setShowAll] = useState(false);

  // ── Листки текущего филиала ───────────────────────────────────────────────────────────────────────
  const filialSheets = useMemo(
    () => userFilialId === null
      ? sheets
      : sheets.filter((s) => s.filialId === userFilialId),
    [sheets, userFilialId],
  );

  const filialVoltageIds = useMemo(() => {
    if (userFilialId === null) return null;
    const ids = filialVoltageMap[String(userFilialId)];
    return ids ? new Set(ids) : new Set<number>();
  }, [filialVoltageMap, userFilialId]);

  const filialVoltages = useMemo(
    () => filialVoltageIds === null
      ? voltages
      : voltages.filter((v) => filialVoltageIds.has(v.id)),
    [voltages, filialVoltageIds],
  );

  const filialLines = useMemo(
    () => filialVoltageIds === null
      ? lines
      : lines.filter((l) => filialVoltageIds.has(l.voltageId)),
    [lines, filialVoltageIds],
  );

  const sheetMap      = useMemo(() => new Map(filialSheets.map((s) => [s.id, s])),  [filialSheets]);
  const defectTypeMap = useMemo(() => new Map(defectTypes.map((d) => [d.id, d])),   [defectTypes]);
  const elementMap    = useMemo(() => new Map(elements.map((e) => [e.id, e])),       [elements]);
  const phaseMap      = useMemo(() => new Map(phases.map((p) => [p.id, p])),         [phases]);
  const lineMap       = useMemo(() => new Map(filialLines.map((l) => [l.id, l])),   [filialLines]);
  const voltageMap    = useMemo(() => new Map(voltages.map((v) => [v.id, v])),       [voltages]);

  const filteredLines = useMemo(() => {
    if (!voltageFilter) return filialLines;
    return filialLines.filter((l) => String(l.voltageId) === voltageFilter);
  }, [filialLines, voltageFilter]);

  const rows = useMemo<JournalRow[]>(() => {
    return defects
      .filter((d) => {
        const sheet = sheetMap.get(d.sheetId);
        if (!sheet) return false;
        if (statusFilter === 'active' && !!d.isFixed)  return false;
        if (statusFilter === 'fixed'  && !d.isFixed)   return false;
        if (dateFrom && d.dateFound < dateFrom) return false;
        if (dateTo   && d.dateFound > dateTo)   return false;
        if (voltageFilter && String(sheet.voltageId) !== voltageFilter) return false;
        if (lineFilter    && String(sheet.lineId)    !== lineFilter)    return false;
        if (selectedDefectTypeIds.size > 0 && !selectedDefectTypeIds.has(d.defectId)) return false;
        if (inspectorFilter) {
          if (!d.inspectorFind.toLowerCase().includes(inspectorFilter.toLowerCase())) return false;
        }
        if (poleFilter) {
          const parsed = parsePoleFilter(poleFilter);
          if (parsed) {
            const { min, max } = parsed;
            const poleMatch = d.poleNumber >= min && d.poleNumber <= max;
            const spanMatch = matchesSpanRange(d.spanRange, min, max);
            if (!poleMatch && !spanMatch) return false;
          }
        }
        return true;
      })
      .map((d) => {
        const sheet      = sheetMap.get(d.sheetId)!;
        const defectType = defectTypeMap.get(d.defectId);
        const element    = defectType ? elementMap.get(defectType.elementId) : undefined;
        const phase      = d.phaseId  ? phaseMap.get(d.phaseId)              : undefined;
        const line       = lineMap.get(sheet.lineId);
        const voltage    = voltageMap.get(sheet.voltageId);
        const location   = [
          d.spanRange  ? `Пр. ${d.spanRange}`  : d.poleNumber ? `Оп. ${d.poleNumber}` : null,
          phase?.name  ?? null,
          element && defectType ? `${element.name}: ${defectType.name}` : defectType?.name ?? null,
        ].filter(Boolean).join(' / ');
        return { d, line, voltage, location };
      })
      .sort((a, b) => (a.d.dateFound < b.d.dateFound ? 1 : -1));
  }, [
    defects, statusFilter, dateFrom, dateTo, voltageFilter, lineFilter,
    selectedDefectTypeIds, inspectorFilter, poleFilter, sheetMap, defectTypeMap, elementMap,
    phaseMap, lineMap, voltageMap,
  ]);

  const selectableIds = useMemo(() => rows.filter((r) => !r.d.isFixed).map((r) => r.d.id), [rows]);

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

  const hasFilters = Boolean(
    statusFilter !== 'all' || voltageFilter || lineFilter
    || selectedDefectTypeIds.size > 0 || inspectorFilter || poleFilter || dateFrom || dateTo,
  );

  const isGated = !showAll;

  const filialDefectCount = useMemo(
    () => defects.filter((d) => sheetMap.has(d.sheetId)).length,
    [defects, sheetMap],
  );

  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    setVoltageFilter('');
    setLineFilter('');
    setSelectedDefectTypeIds(new Set());
    setInspectorFilter('');
    setPoleFilter('');
    setDateFrom('');
    setDateTo('');
    setShowAll(false);
  }, []);

  const handleShowAll = useCallback(() => setShowAll(true), []);

  const handleSetStatusFilter    = useCallback((v: StatusFilter) => { setStatusFilter(v);              setShowAll(false); }, []);
  const handleSetLineFilter      = useCallback((v: string)       => { setLineFilter(v);               setShowAll(false); }, []);
  const handleSetInspectorFilter = useCallback((v: string)       => { setInspectorFilter(v);          setShowAll(false); }, []);
  const handleSetPoleFilter      = useCallback((v: string)       => { setPoleFilter(v);               setShowAll(false); }, []);
  const handleSetDateFrom        = useCallback((v: string)       => { setDateFrom(v);                 setShowAll(false); }, []);
  const handleSetDateTo          = useCallback((v: string)       => { setDateTo(v);                   setShowAll(false); }, []);
  const handleSetDefectTypeIds   = useCallback((ids: Set<number>) => { setSelectedDefectTypeIds(ids); setShowAll(false); }, []);

  const handleVoltageChange = useCallback((value: string) => {
    setVoltageFilter(value);
    setLineFilter('');
    setShowAll(false);
  }, []);

  return {
    defects,
    elements,
    defectTypes,
    filialDefectCount,
    voltages: filialVoltages,
    filteredLines,
    rows,
    selectedIds,
    allSelected,
    handleSelect,
    handleSelectAll,
    clearSelection,
    statusFilter,
    voltageFilter,
    lineFilter,
    selectedDefectTypeIds,
    inspectorFilter,
    dateFrom,
    dateTo,
    hasFilters,
    isGated,
    handleShowAll,
    setStatusFilter: handleSetStatusFilter,
    handleVoltageChange,
    setLineFilter: handleSetLineFilter,
    setSelectedDefectTypeIds: handleSetDefectTypeIds,
    setInspectorFilter: handleSetInspectorFilter,
    poleFilter,
    setPoleFilter: handleSetPoleFilter,
    setDateFrom: handleSetDateFrom,
    setDateTo: handleSetDateTo,
    resetFilters,
  };
}
