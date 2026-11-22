import { memo, useMemo } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { DefectRecord } from '@/entities/DefectRecord';
import type { DefectType, Element } from '@/entities/InspectionLine';
import { getRouteSheetDetail } from '@/shared/const/router';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import cls from './GlobalDefectSearch.module.scss';
import { TableRow, TableTd } from '@/shared/ui';

interface SheetDefectRowsProps {
  sheetId: number;
  lineName: string;
  filialName: string;
  voltageName: string;
  defectTypeIds: number[];
  defects: DefectRecord[];
  defectTypes: DefectType[];
  elements: Element[];
  navigate: NavigateFunction;
}

export const SheetDefectRows = memo((props: SheetDefectRowsProps) => {
  const { sheetId, lineName, filialName, voltageName, defectTypeIds, defects, defectTypes, elements, navigate } = props;

  const idSet = useMemo(() => new Set(defectTypeIds), [defectTypeIds]);

  const matches = useMemo(() => {
    if (idSet.size === 0) return [];
    return defects.filter((d: DefectRecord) => idSet.has(d.defectId));
  }, [defects, idSet]);

  if (matches.length === 0) return null;

  return (
    <>
      {matches.map((d: DefectRecord) => {
        const dt = defectTypes.find((t: DefectType) => t.id === d.defectId);
        const el = elements.find((e: Element) => e.id === dt?.elementId);
        return (
          <TableRow key={d.id} className={cls.row} onClick={() => navigate(getRouteSheetDetail(String(sheetId)))}>
            <TableTd className={cls.cell}>{filialName}</TableTd>
            <TableTd className={cls.cell}>{voltageName}</TableTd>
            <TableTd className={cls.cell}>{lineName}</TableTd>
            <TableTd className={cls.cell}>{d.poleNumber}</TableTd>
            <TableTd className={cls.cell}>{el?.name ?? '—'}</TableTd>
            <TableTd className={cls.cell}>{d.customName?.trim() || dt?.name || '—'}</TableTd>
            <TableTd className={cls.cell}>{formatDate(d.dateFound)}</TableTd>
            <TableTd className={cls.cell}>
              <span className={d.isFixed ? cls.fixed : cls.active}>
                {d.isFixed ? 'Устранено' : 'Активен'}
              </span>
            </TableTd>
          </TableRow>
        );
      })}
    </>
  );
});
SheetDefectRows.displayName = 'SheetDefectRows';
