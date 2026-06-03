import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useGetSheetsQuery } from '@/entities/InspectionSheet';
import type { InspectionSheet } from '@/entities/InspectionSheet';
import { getUserFilialId, getUserIsAdmin } from '@/entities/User';

/**
 * Возвращает листки осмотра, отфильтрованные по филиалу текущего пользователя.
 * Администратор видит все листки. RTK Query кеш общий — лишних запросов нет.
 *
 * Используется и в useSheetsList (основная таблица), и в SheetsListNavbarSlot
 * (счётчик в навбаре) — единый источник логики фильтрации.
 */
export function useFilialSheets(): InspectionSheet[] {
  const { data: sheets = [] } = useGetSheetsQuery();
  const userFilialId = useSelector(getUserFilialId);
  const isAdmin = useSelector(getUserIsAdmin);

  return useMemo(() => {
    if (!isAdmin && userFilialId !== null) {
      return sheets.filter((s) => s.filialId === userFilialId);
    }
    return sheets;
  }, [sheets, userFilialId, isAdmin]);
}
