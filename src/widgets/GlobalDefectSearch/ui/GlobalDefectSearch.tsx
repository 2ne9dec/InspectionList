import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconWarning } from '@/shared/ui/Icons';
import { useGetSheetsQuery } from '@/entities/InspectionSheet';
import { useGetAllDefectsQuery } from '@/entities/DefectRecord';
import {
  useGetFilialsQuery,
  useGetVoltagesQuery,
  useGetLinesQuery,
  useGetDefectTypesQuery,
  useGetElementsQuery,
} from '@/entities/InspectionLine';
import { SheetDefectRows } from './SheetDefectRows';
import cls from './GlobalDefectSearch.module.scss';

interface GlobalDefectSearchProps {
  query: string;
}

export const GlobalDefectSearch = memo(({ query }: GlobalDefectSearchProps) => {
  const navigate = useNavigate();
  const trimmed  = query.trim();

  const { data: sheets   = [] } = useGetSheetsQuery();
  const { data: filials  = [] } = useGetFilialsQuery();
  const { data: voltages = [] } = useGetVoltagesQuery();
  const { data: lines    = [] } = useGetLinesQuery();
  const { data: defTypes = [] } = useGetDefectTypesQuery();
  const { data: elements = [] } = useGetElementsQuery();
  const { data: allDefects = [] } = useGetAllDefectsQuery(undefined, { skip: !trimmed });

  const filialById  = useMemo(() => new Map(filials.map((f) => [f.id, f])),  [filials]);
  const voltageById = useMemo(() => new Map(voltages.map((v) => [v.id, v])), [voltages]);
  const lineById    = useMemo(() => new Map(lines.map((l) => [l.id, l])),    [lines]);

  const defectsBySheet = useMemo(() => {
    const map = new Map<number, typeof allDefects>();
    for (const d of allDefects) {
      const arr = map.get(d.sheetId) ?? [];
      arr.push(d);
      map.set(d.sheetId, arr);
    }
    return map;
  }, [allDefects]);

  const defectRowsCount = useMemo(() => {
    if (!trimmed) return 0;
    const q = trimmed.toLowerCase();
    let count = 0;
    for (const [, defs] of defectsBySheet) {
      count += defs.filter((d) => {
        const dt   = defTypes.find((t) => t.id === d.defectId);
        const elem = elements.find((e) => e.id === dt?.element_id)?.name ?? '';
        return (
          (dt?.name ?? '').toLowerCase().includes(q) ||
          elem.toLowerCase().includes(q) ||
          String(d.poleNumber ?? '').includes(q) ||
          (d.dateFound ?? '').includes(q) ||
          (d.inspectorFind ?? '').toLowerCase().includes(q)
        );
      }).length;
    }
    return count;
  }, [defectsBySheet, trimmed, elements, defTypes]);

  if (!trimmed) return null;

  return (
    <div className={cls.wrap}>
      <div className={cls.title}>
        Поиск: <strong>«{query}»</strong>
      </div>

      <div className={cls.tabs}>
        <button className={[cls.tab, cls['tab--active']].join(' ')}>
          <IconWarning size={12} /> Дефекты
          <span className={cls.tabCount}>{defectRowsCount}</span>
        </button>
      </div>

      <div className={cls.tableWrap}>
        <table className={cls.table}>
          <thead>
            <tr>
              {['Филиал', 'Напряжение', 'Линия', 'Опора', 'Элемент', 'Дефект', 'Серьёзность', 'Дата', 'Статус'].map((h) => (
                <th key={h} className={cls.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheets.map((s) => (
              <SheetDefectRows
                key={s.id}
                sheetId={s.id}
                lineName={lineById.get(s.lineId)?.name ?? '—'}
                filialName={filialById.get(s.filialId)?.name ?? '—'}
                voltageName={voltageById.get(s.voltageId)?.name ?? '—'}
                query={trimmed}
                defects={defectsBySheet.get(s.id) ?? []}
                defectTypes={defTypes}
                elements={elements}
                navigate={navigate}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
GlobalDefectSearch.displayName = 'GlobalDefectSearch';
