import { memo, useMemo } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { DefectRecord } from '@/entities/DefectRecord';
import type { DefectType, Element, Severity } from '@/entities/InspectionLine';
import { SEVERITY_COLORS, SEVERITY_LABELS } from '@/entities/InspectionLine';
import { getRouteSheetDetail } from '@/shared/const/router';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import cls from './GlobalDefectSearch.module.scss';

interface SheetDefectRowsProps {
  sheetId: number;
  lineName: string;
  filialName: string;
  voltageName: string;
  query: string;
  defects: DefectRecord[];
  defectTypes: DefectType[];
  elements: Element[];
  navigate: NavigateFunction;
}

export const SheetDefectRows = memo((props: SheetDefectRowsProps) => {
  const { sheetId, lineName, filialName, voltageName, query, defects, defectTypes, elements, navigate } = props;

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return defects
      .filter((d: DefectRecord) => {
        const dt = defectTypes.find((t: DefectType) => t.id === d.defectId);
        const el = elements.find((e: Element) => e.id === dt?.element_id);
        return (
          dt?.name.toLowerCase().includes(q) ||
          el?.name.toLowerCase().includes(q) ||
          String(d.poleNumber).includes(q) ||
          d.dateFound.includes(q) ||
          d.inspectorFind.toLowerCase().includes(q)
        );
      })
      .slice(0, 5);
  }, [defects, query, defectTypes, elements]);

  if (matches.length === 0) return null;

  return (
    <>
      {matches.map((d: DefectRecord) => {
        const dt = defectTypes.find((t: DefectType) => t.id === d.defectId);
        const el = elements.find((e: Element) => e.id === dt?.element_id);
        const sev = (dt?.severity ?? 'low') as Severity;
        return (
          <tr key={d.id} className={cls.row} onClick={() => navigate(getRouteSheetDetail(String(sheetId)))}>
            <td className={cls.cell}>{filialName}</td>
            <td className={cls.cell}>{voltageName}</td>
            <td className={cls.cell}>{lineName}</td>
            <td className={cls.cell}>{d.poleNumber}</td>
            <td className={cls.cell}>{el?.name ?? '—'}</td>
            <td className={cls.cell}>{dt?.name ?? '—'}</td>
            <td className={cls.cell}>
              <span className={cls.badge} style={{ background: SEVERITY_COLORS[sev] }}>
                {SEVERITY_LABELS[sev]}
              </span>
            </td>
            <td className={cls.cell}>{formatDate(d.dateFound)}</td>
            <td className={cls.cell}>
              <span className={d.isFixed ? cls.fixed : cls.active}>
                {d.isFixed ? 'Устранено' : 'Активен'}
              </span>
            </td>
          </tr>
        );
      })}
    </>
  );
});
SheetDefectRows.displayName = 'SheetDefectRows';
