import { useCallback, useMemo, useState } from 'react';
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
} from '@/entities/InspectionLine';

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
export function useJournalFilters() {
  const { data: defects     = [] } = useGetAllDefectsQuery();
  const { data: sheets      = [] } = useGetSheetsQuery();
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const { data: elements    = [] } = useGetElementsQuery();
  const { data: phases      = [] } = useGetPhasesQuery();
  const { data: lines       = [] } = useGetLinesQuery();
  const { data: voltages    = [] } = useGetVoltagesQuery();

  // ── Фильтры ────────────────────────────────────────────────────────────────
  const [statusFilter,    setStatusFilter]    = useState<StatusFilter>('all');
  const [voltageFilter,   setVoltageFilter]   = useState('');
  const [lineFilter,      setLineFilter]      = useState('');
  const [defectFilter,    setDefectFilter]    = useState('');
  const [inspectorFilter, setInspectorFilter] = useState('');
  const [dateFrom,        setDateFrom]        = useState('');
  const [dateTo,          setDateTo]          = useState('');

  // ── Выбор строк ────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // ── Предвычисленные Map (O(1) поиск) ──────────────────────────────────────
  const sheetMap      = useMemo(() => new Map(sheets.map((s) => [s.id, s])),      [sheets]);
  const defectTypeMap = useMemo(() => new Map(defectTypes.map((d) => [d.id, d])), [defectTypes]);
  const elementMap    = useMemo(() => new Map(elements.map((e) => [e.id, e])),    [elements]);
  const phaseMap      = useMemo(() => new Map(phases.map((p) => [p.id, p])),      [phases]);
  const lineMap       = useMemo(() => new Map(lines.map((l) => [l.id, l])),       [lines]);
  const voltageMap    = useMemo(() => new Map(voltages.map((v) => [v.id, v])),    [voltages]);

  const filteredLines = useMemo(() => {
    if (!voltageFilter) return lines;
    return lines.filter((l) => String(l.voltage_id) === voltageFilter);
  }, [lines, voltageFilter]);

  // ── Вычисление строк ───────────────────────────────────────────────────────
  const rows = useMemo<JournalRow[]>(() => {
    return defects
      .filter((d) => {
        if (statusFilter === 'active' && !!d.isFixed)  return false;
        if (statusFilter === 'fixed'  && !d.isFixed)   return false;
        if (dateFrom && d.dateFound < dateFrom) return false;
        if (dateTo   && d.dateFound > dateTo)   return false;
        const sheet = sheetMap.get(d.sheetId);
        if (!sheet) return false;
        if (voltageFilter && String(sheet.voltageId) !== voltageFilter) return false;
        if (lineFilter    && String(sheet.lineId)    !== lineFilter)    return false;
        if (defectFilter) {
          const dt = defectTypeMap.get(d.defectId);
          const el = dt ? elementMap.get(dt.element_id) : undefined;
          const haystack = [el?.name, dt?.name].filter(Boolean).join(' ').toLowerCase();
          if (!haystack.includes(defectFilter.toLowerCase())) return false;
        }
        if (inspectorFilter) {
          if (!d.inspectorFind.toLowerCase().includes(inspectorFilter.toLowerCase())) return false;
        }
        return true;
      })
      .map((d) => {
        const sheet      = sheetMap.get(d.sheetId)!;
        const defectType = defectTypeMap.get(d.defectId);
        const element    = defectType ? elementMap.get(defectType.element_id) : undefined;
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
    defectFilter, inspectorFilter, sheetMap, defectTypeMap, elementMap,
    phaseMap, lineMap, voltageMap,
  ]);

  // ── Выбор ─────────────────────────────────────────────────────────────────
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

  // ── Фильтры — сброс и сеттеры ─────────────────────────────────────────────
  const hasFilters = Boolean(
    statusFilter !== 'all' || voltageFilter || lineFilter
    || defectFilter || inspectorFilter || dateFrom || dateTo,
  );

  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    setVoltageFilter('');
    setLineFilter('');
    setDefectFilter('');
    setInspectorFilter('');
    setDateFrom('');
    setDateTo('');
  }, []);

  /** Сброс фильтра линии при смене напряжения */
  const handleVoltageChange = useCallback((value: string) => {
    setVoltageFilter(value);
    setLineFilter('');
  }, []);

  return {
    defects,
    voltages,
    filteredLines,
    rows,
    // selection
    selectedIds,
    allSelected,
    handleSelect,
    handleSelectAll,
    clearSelection,
    // filter values
    statusFilter,
    voltageFilter,
    lineFilter,
    defectFilter,
    inspectorFilter,
    dateFrom,
    dateTo,
    hasFilters,
    // filter setters
    setStatusFilter,
    handleVoltageChange,
    setLineFilter,
    setDefectFilter,
    setInspectorFilter,
    setDateFrom,
    setDateTo,
    resetFilters,
  };
}
