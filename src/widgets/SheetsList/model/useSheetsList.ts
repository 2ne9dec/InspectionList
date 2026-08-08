import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useGetSheetsQuery, useDeleteSheetMutation } from '@/entities/InspectionSheet';
import type { InspectionSheetFull, SheetStatus } from '@/entities/InspectionSheet';
import {
  useGetFilialsQuery,
  useGetLinesQuery,
  useGetVoltagesQuery,
} from '@/entities/InspectionLine';
import { useGetDefectCountsQuery } from '@/entities/DefectRecord';
import { getUserFilialId } from '@/entities/User';
import { selectCreateSheetSearch } from '@/features/CreateSheet';

export type SheetSortKey = 'voltage' | 'date' | 'inspector';
export type SortDir = 'asc' | 'desc';
export type StatusFilter = 'all' | SheetStatus;

interface UseSheetsListOptions {
  dateFrom: string;
  dateTo: string;
  statusFilter: StatusFilter;
}

export function useSheetsList({ dateFrom, dateTo, statusFilter }: UseSheetsListOptions) {
  const search = useSelector(selectCreateSheetSearch);
  const userFilialId = useSelector(getUserFilialId);

  const [sortKey, setSortKey] = useState<SheetSortKey>('voltage');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = useCallback((key: SheetSortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  // Даты фильтруются на сервере — передаём в запрос, чтобы не грузить всю историю
  const { data: sheets = [], isLoading } = useGetSheetsQuery({ dateFrom, dateTo });
  const { data: filials = [] } = useGetFilialsQuery();
  const { data: voltages = [] } = useGetVoltagesQuery();
  const { data: lines = [] } = useGetLinesQuery();
  // Загружаем только агрегированные счётчики (один объект на листок),
  // а не все дефекты целиком — критично при 200 листках × 1000 дефектов.
  const { data: defectCounts = [] } = useGetDefectCountsQuery();
  const [deleteSheet] = useDeleteSheetMutation();

  const defectsBySheet = useMemo(() => {
    const map = new Map<number, { active: number; fixed: number }>();
    for (const c of defectCounts) {
      map.set(c.sheetId, { active: c.active, fixed: c.fixed });
    }
    return map;
  }, [defectCounts]);

  const filialById  = useMemo(() => new Map(filials.map((f) => [f.id, f])), [filials]);
  const voltageById = useMemo(() => new Map(voltages.map((v) => [v.id, v])), [voltages]);
  const lineById    = useMemo(() => new Map(lines.map((l) => [l.id, l])), [lines]);

  const enriched = useMemo<InspectionSheetFull[]>(
    () =>
      sheets.map((s) => {
        const filial  = filialById.get(s.filialId);
        const voltage = voltageById.get(s.voltageId);
        const line    = lineById.get(s.lineId);
        const counts  = defectsBySheet.get(s.id) ?? { active: 0, fixed: 0 };
        return {
          ...s,
          filialName:  filial?.name  ?? '—',
          voltageName: voltage?.name ?? '—',
          lineName:    line?.name    ?? '—',
          poleStart:   line?.poleStart ?? 1,
          poleEnd:     line?.poleEnd   ?? 1,
          poleCount:   line?.poleCount ?? 0,
          activeCount: counts.active,
          fixedCount:  counts.fixed,
        };
      }),
    [sheets, filialById, voltageById, lineById, defectsBySheet],
  );

  // Подсчёт листков по статусам (до применения фильтра статуса, но после остальных)
  const statusCounts = useMemo(() => {
    const base = enriched.filter((s) => {
      if (userFilialId !== null && s.filialId !== userFilialId) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.lineName.toLowerCase().includes(q) ||
          s.filialName.toLowerCase().includes(q) ||
          s.voltageName.toLowerCase().includes(q) ||
          s.createdBy.toLowerCase().includes(q)
        );
      }
      return true;
    });
    return {
      all:      base.length,
      active:   base.filter((s) => s.status === 'active').length,
      archived: base.filter((s) => s.status === 'archived').length,
    };
  }, [enriched, userFilialId, search]);

  const filtered = useMemo(() => {
    let result = enriched;

    if (userFilialId !== null) {
      result = result.filter((s) => s.filialId === userFilialId);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.lineName.toLowerCase().includes(q) ||
          s.filialName.toLowerCase().includes(q) ||
          s.voltageName.toLowerCase().includes(q) ||
          s.createdBy.toLowerCase().includes(q),
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter);
    }

    // dateFrom / dateTo фильтруются сервером

    return result;
  }, [enriched, search, statusFilter, userFilialId]);

  const sorted = useMemo(() => {
    /** Извлекаем кВ из строки вида "ВЛ-110 кВ" -> 110 для числовой сортировки. */
    const voltageKv = (name: string): number => {
      const m = name.match(/\d+/);
      return m ? Number(m[0]) : 0;
    };

    const cmp = (a: InspectionSheetFull, b: InspectionSheetFull): number => {
      let v = 0;
      if (sortKey === 'voltage')   v = voltageKv(a.voltageName) - voltageKv(b.voltageName);
      if (sortKey === 'date')      v = a.createdDate.localeCompare(b.createdDate);
      if (sortKey === 'inspector') v = a.createdBy.localeCompare(b.createdBy, 'ru');
      return sortDir === 'asc' ? v : -v;
    };

    return [...filtered].sort(cmp);
  }, [filtered, sortKey, sortDir]);

  return {
    sheets: sorted,
    isLoading,
    deleteSheet,
    hasSearch: !!search.trim(),
    sortKey,
    sortDir,
    toggleSort,
    statusCounts,
  };
}
