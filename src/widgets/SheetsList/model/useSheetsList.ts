import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useGetSheetsQuery, useDeleteSheetMutation } from '@/entities/InspectionSheet';
import {
  useGetFilialsQuery,
  useGetLinesQuery,
  useGetVoltagesQuery,
} from '@/entities/InspectionLine';
import { useGetDefectCountsQuery } from '@/entities/DefectRecord';
import { getUserEffectiveFilialId } from '@/entities/User';
import { selectCreateSheetSearch } from '@/features/CreateSheet';
import { usePendingSheets } from '@/shared/lib/offline/pendingSheets';
import {
  countStatuses,
  enrichPendingSheets,
  enrichSheets,
  filterPendingSheets,
  filterSheets,
  mapDefectCounts,
  sortSheets,
} from '../lib/sheetList';
import type { SheetSortKey, SortDir, StatusFilter } from '../lib/sheetList';

export type { SheetSortKey, SortDir, StatusFilter } from '../lib/sheetList';

interface UseSheetsListOptions {
  dateFrom: string;
  dateTo: string;
  statusFilter: StatusFilter;
}

export function useSheetsList({ dateFrom, dateTo, statusFilter }: UseSheetsListOptions) {
  const search = useSelector(selectCreateSheetSearch);
  // Свой филиал пользователя или выбранный в переключателе (наблюдатель РУП)
  const userFilialId = useSelector(getUserEffectiveFilialId);

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

  // Офлайн: если браузер сообщает об отсутствии сети — пропускаем запрос к серверу
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  // Даты фильтруются на сервере — передаём в запрос, чтобы не грузить всю историю
  const { data: sheets = [], isLoading } = useGetSheetsQuery(
    { dateFrom, dateTo },
    { skip: !isOnline },
  );
  const { data: filials = [] } = useGetFilialsQuery();
  const { data: voltages = [] } = useGetVoltagesQuery();
  const { data: lines = [] } = useGetLinesQuery();
  // Загружаем только агрегированные счётчики (один объект на листок),
  // а не все дефекты целиком — критично при 200 листках × 1000 дефектов.
  const { data: defectCounts = [] } = useGetDefectCountsQuery();
  const [deleteSheet] = useDeleteSheetMutation();

  // Офлайн-листки из localStorage
  const pendingSheets = usePendingSheets();

  // Не показываем спиннер если уже есть pending-листки для отображения
  const effectiveLoading = isLoading && pendingSheets.length === 0;

  const defectsBySheet = useMemo(() => mapDefectCounts(defectCounts), [defectCounts]);

  const maps = useMemo(() => ({
    filialById: new Map(filials.map((f) => [f.id, f])),
    voltageById: new Map(voltages.map((v) => [v.id, v])),
    lineById: new Map(lines.map((l) => [l.id, l])),
  }), [filials, voltages, lines]);

  const enriched = useMemo(
    () => enrichSheets(sheets, maps, defectsBySheet),
    [sheets, maps, defectsBySheet],
  );

  const pendingEnriched = useMemo(
    () => enrichPendingSheets(pendingSheets, maps),
    [pendingSheets, maps],
  );

  const statusCounts = useMemo(
    () => countStatuses(enriched, pendingEnriched, userFilialId, search),
    [enriched, pendingEnriched, userFilialId, search],
  );

  const filtered = useMemo(
    () => filterSheets(enriched, userFilialId, search, statusFilter),
    [enriched, userFilialId, search, statusFilter],
  );

  const sorted = useMemo(
    () => sortSheets(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  );

  // Офлайн-листки всегда сверху (при фильтре 'all').
  const allSheets = useMemo(
    () => (statusFilter === 'all'
      ? [...filterPendingSheets(pendingEnriched, userFilialId, search), ...sorted]
      : sorted),
    [statusFilter, sorted, pendingEnriched, search, userFilialId],
  );

  return {
    sheets: allSheets,
    isLoading: effectiveLoading,
    deleteSheet,
    hasSearch: !!search.trim(),
    sortKey,
    sortDir,
    toggleSort,
    statusCounts,
  };
}
