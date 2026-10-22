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
  defectTypeIds: number[];
}

export const GlobalDefectSearch = memo(({ defectTypeIds }: GlobalDefectSearchProps) => {
  const navigate = useNavigate();

  const { data: sheets   = [] } = useGetSheetsQuery({})  // no date filter: load all sheets;
  const { data: filials  = [] } = useGetFilialsQuery();
  const { data: voltages = [] } = useGetVoltagesQuery();
  const { data: lines    = [] } = useGetLinesQuery();
  const { data: defTypes = [] } = useGetDefectTypesQuery();
  const { data: elements = [] } = useGetElementsQuery();
  const { data: allDefects = [] } = useGetAllDefectsQuery(undefined, { skip: defectTypeIds.length === 0 });

  const idSet = useMemo(() => new Set(defectTypeIds), [defectTypeIds]);

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

  const totalCount = useMemo(() => {
    if (idSet.size === 0) return 0;
    let count = 0;
    for (const [, defs] of defectsBySheet) {
      count += defs.filter((d) => idSet.has(d.defectId)).length;
    }
    return count;
  }, [defectsBySheet, idSet]);

  // Названия выбранных типов дефектов
  const selectedNames = useMemo(
    () => defTypes.filter((dt) => idSet.has(dt.id)).map((dt) => dt.name),
    [defTypes, idSet],
  );

  if (defectTypeIds.length === 0) return null;

  return (
    <div className={cls.wrap}>
      <div className={cls.title}>
        Дефекты: <strong>{selectedNames.join(', ')}</strong>
      </div>

      <div className={cls.tabs}>
        <button className={[cls.tab, cls['tab--active']].join(' ')}>
          <IconWarning size={12} /> Дефекты
          <span className={cls.tabCount}>{totalCount}</span>
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
                defectTypeIds={defectTypeIds}
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
