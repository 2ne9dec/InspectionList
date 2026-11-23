import type { InspectionSheet, InspectionSheetFull, SheetStatus } from '@/entities/InspectionSheet';
import type { Filial, Line, Voltage } from '@/entities/InspectionLine';
import type { DefectCount } from '@/entities/DefectRecord';
import type { PendingSheet } from '@/shared/lib/offline/pendingSheets';

export type SheetSortKey = 'voltage' | 'date' | 'inspector';
export type SortDir = 'asc' | 'desc';
export type StatusFilter = 'all' | SheetStatus;

export interface SheetMaps {
  filialById: Map<number, Filial>;
  voltageById: Map<number, Voltage>;
  lineById: Map<number, Line>;
}

/** Map<sheetId, {active, fixed}> по агрегированным счётчикам. */
export function mapDefectCounts(counts: DefectCount[]): Map<number, { active: number; fixed: number }> {
  const map = new Map<number, { active: number; fixed: number }>();
  for (const c of counts) map.set(c.sheetId, { active: c.active, fixed: c.fixed });
  return map;
}

/** Обогащает серверные листки названиями и границами опор. */
export function enrichSheets(
  sheets: InspectionSheet[],
  { filialById, voltageById, lineById }: SheetMaps,
  defectsBySheet: Map<number, { active: number; fixed: number }>,
): InspectionSheetFull[] {
  return sheets.map((s) => {
    const filial = filialById.get(s.filialId);
    const voltage = voltageById.get(s.voltageId);
    const line = lineById.get(s.lineId);
    const counts = defectsBySheet.get(s.id) ?? { active: 0, fixed: 0 };
    return {
      ...s,
      filialName: filial?.name ?? '—',
      voltageName: voltage?.name ?? '—',
      lineName: line?.name ?? '—',
      poleStart: line?.poleStart ?? 1,
      poleEnd: line?.poleEnd ?? 1,
      poleCount: line?.poleCount ?? 0,
      activeCount: counts.active,
      fixedCount: counts.fixed,
    };
  });
}

/** Обогащает офлайн-листки. */
export function enrichPendingSheets(
  pending: PendingSheet[],
  { filialById, voltageById, lineById }: SheetMaps,
): InspectionSheetFull[] {
  return pending.map((p) => {
    const filial = filialById.get(p.filialId);
    const voltage = voltageById.get(p.voltageId);
    const line = lineById.get(p.lineId);
    return {
      id: p.localId,
      filialId: p.filialId,
      voltageId: p.voltageId,
      lineId: p.lineId,
      createdDate: p.createdDate,
      createdBy: p.createdBy,
      inspectors: p.createdBy,
      mergedBy: null,
      status: 'pending' as const,
      filialName: filial?.name ?? '—',
      voltageName: voltage?.name ?? '—',
      lineName: line?.name ?? '—',
      poleStart: line?.poleStart ?? 1,
      poleEnd: line?.poleEnd ?? 1,
      poleCount: line?.poleCount ?? 0,
      activeCount: 0,
      fixedCount: 0,
    };
  });
}

export function matchesSheetSearch(sheet: InspectionSheetFull, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    sheet.lineName.toLowerCase().includes(q) ||
    sheet.filialName.toLowerCase().includes(q) ||
    sheet.voltageName.toLowerCase().includes(q) ||
    sheet.createdBy.toLowerCase().includes(q) ||
    (sheet.inspectors ?? '').toLowerCase().includes(q) ||
    (sheet.mergedBy ?? '').toLowerCase().includes(q)
  );
}

export function filterSheets(
  sheets: InspectionSheetFull[],
  userFilialId: number | null,
  search: string,
  statusFilter: StatusFilter,
): InspectionSheetFull[] {
  return sheets.filter((s) => {
    if (userFilialId !== null && s.filialId !== userFilialId) return false;
    if (!matchesSheetSearch(s, search)) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    return true;
  });
}

export function filterPendingSheets(
  pending: InspectionSheetFull[],
  userFilialId: number | null,
  search: string,
): InspectionSheetFull[] {
  return pending.filter((p) => {
    if (userFilialId !== null && p.filialId !== userFilialId) return false;
    return matchesSheetSearch(p, search);
  });
}

/** Числовая сортировка по кВ из строки вида «ВЛ-110 кВ». */
function voltageKv(name: string): number {
  const m = name.match(/\d+/);
  return m ? Number(m[0]) : 0;
}

export function sortSheets(
  sheets: InspectionSheetFull[],
  sortKey: SheetSortKey,
  sortDir: SortDir,
): InspectionSheetFull[] {
  return [...sheets].sort((a, b) => {
    let v = 0;
    if (sortKey === 'voltage') v = voltageKv(a.voltageName) - voltageKv(b.voltageName);
    if (sortKey === 'date') v = a.createdDate.localeCompare(b.createdDate);
    if (sortKey === 'inspector') {
      v = (a.inspectors ?? a.createdBy).localeCompare(b.inspectors ?? b.createdBy, 'ru');
    }
    return sortDir === 'asc' ? v : -v;
  });
}

export function countStatuses(
  enriched: InspectionSheetFull[],
  pending: InspectionSheetFull[],
  userFilialId: number | null,
  search: string,
) {
  const base = enriched.filter(
    (s) => (userFilialId === null || s.filialId === userFilialId) && matchesSheetSearch(s, search),
  );
  return {
    all: base.length + pending.length,
    active: base.filter((s) => s.status === 'active').length,
    archived: base.filter((s) => s.status === 'archived').length,
  };
}
