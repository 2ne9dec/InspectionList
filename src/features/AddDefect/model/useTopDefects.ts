import { useMemo } from 'react';
import type { DefectRecord } from '@/entities/DefectRecord';
import { useGetDefectsBySheetQuery } from '@/entities/DefectRecord';
import type { DefectType } from '@/entities/InspectionLine';

/**
 * Возвращает топ-5 типов дефектов по частоте встречаемости в данном листке.
 * Используется для кнопок быстрого выбора (QuickDefectChips).
 */
export function useTopDefects(sheetId: number, defectTypes: DefectType[]): DefectType[] {
  const { data: sheetDefects = [] } = useGetDefectsBySheetQuery(sheetId);

  return useMemo(() => {
    const counts: Record<number, number> = {};
    (sheetDefects as DefectRecord[]).forEach((d) => {
      counts[d.defectId] = (counts[d.defectId] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => defectTypes.find((dt) => dt.id === Number(id)))
      .filter(Boolean) as DefectType[];
  }, [sheetDefects, defectTypes]);
}
