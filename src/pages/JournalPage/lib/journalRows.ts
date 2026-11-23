import type { DefectRecord } from '@/entities/DefectRecord';
import { formatDefectLocation } from '@/entities/DefectRecord';
import type { InspectionSheet } from '@/entities/InspectionSheet';
import type { DefectType, Element, Line, Phase, Voltage } from '@/entities/InspectionLine';
import { matchesSpanRange, parsePoleFilter } from './poleFilter';

export type JournalStatusFilter = 'all' | 'active' | 'fixed';

export interface JournalRow {
  d: DefectRecord;
  line: Line | undefined;
  voltage: Voltage | undefined;
  /** Название филиала (показывается пользователям, видящим все филиалы) */
  filialName: string;
  location: string;
}

interface JournalRowFilters {
  statusFilter: JournalStatusFilter;
  dateFrom: string;
  dateTo: string;
  voltageFilter: string;
  lineFilter: string;
  selectedDefectTypeIds: ReadonlySet<number>;
  inspectorFilter: string;
  poleFilter: string;
}

interface JournalRowMaps {
  sheetMap: Map<number, InspectionSheet>;
  defectTypeMap: Map<number, DefectType>;
  elementMap: Map<number, Element>;
  phaseMap: Map<number, Phase>;
  lineMap: Map<number, Line>;
  voltageMap: Map<number, Voltage>;
  filialNameMap: Map<number, string>;
}

/** Фильтрация, обогащение и сортировка строк журнала. */
export function buildJournalRows(
  defects: DefectRecord[],
  maps: JournalRowMaps,
  filters: JournalRowFilters,
): JournalRow[] {
  const q = filters.inspectorFilter.toLowerCase();
  const poleParsed = filters.poleFilter ? parsePoleFilter(filters.poleFilter) : null;

  return defects
    .filter((d) => {
      const sheet = maps.sheetMap.get(d.sheetId);
      if (!sheet) return false;
      if (filters.statusFilter === 'active' && !!d.isFixed) return false;
      if (filters.statusFilter === 'fixed' && !d.isFixed) return false;
      if (filters.dateFrom && d.dateFound < filters.dateFrom) return false;
      if (filters.dateTo && d.dateFound > filters.dateTo) return false;
      if (filters.voltageFilter && String(sheet.voltageId) !== filters.voltageFilter) return false;
      if (filters.lineFilter && String(sheet.lineId) !== filters.lineFilter) return false;
      if (filters.selectedDefectTypeIds.size > 0 && !filters.selectedDefectTypeIds.has(d.defectId)) return false;
      if (q && !d.inspectorFind.toLowerCase().includes(q)) return false;
      if (poleParsed) {
        const { min, max } = poleParsed;
        const poleMatch = d.poleNumber >= min && d.poleNumber <= max;
        const spanMatch = matchesSpanRange(d.spanRange, min, max);
        if (!poleMatch && !spanMatch) return false;
      }
      return true;
    })
    .map((d) => {
      const sheet = maps.sheetMap.get(d.sheetId)!;
      const defectType = maps.defectTypeMap.get(d.defectId);
      const element = defectType ? maps.elementMap.get(defectType.elementId) : undefined;
      const phase = d.phaseId ? maps.phaseMap.get(d.phaseId) : undefined;
      const line = maps.lineMap.get(sheet.lineId);
      const voltage = maps.voltageMap.get(sheet.voltageId);
      return {
        d,
        line,
        voltage,
        filialName: maps.filialNameMap.get(sheet.filialId) ?? '—',
        location: formatDefectLocation(d, defectType, element, phase),
      };
    })
    .sort((a, b) => (a.d.dateFound < b.d.dateFound ? 1 : -1));
}
