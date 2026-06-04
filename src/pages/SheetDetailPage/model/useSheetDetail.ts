import { useMemo } from 'react';
import { useGetSheetByIdQuery } from '@/entities/InspectionSheet';
import { useGetFilialsQuery, useGetVoltagesQuery, useGetLinesQuery, useGetDefectTypesQuery, useGetElementsQuery, useGetPhasesQuery } from '@/entities/InspectionLine';
import { useGetDefectsBySheetQuery } from '@/entities/DefectRecord';
import type { InspectionSheetFull } from '@/entities/InspectionSheet';
import type { DefectRecordFull } from '@/entities/DefectRecord';

export function useSheetDetail(sheetId: number) {
  const { data: sheet, isLoading: sheetLoading } = useGetSheetByIdQuery(sheetId);
  const { data: filials  = [] } = useGetFilialsQuery();
  const { data: voltages = [] } = useGetVoltagesQuery();
  const { data: lines    = [] } = useGetLinesQuery();
  const { data: allDefects  = [] } = useGetDefectsBySheetQuery(sheetId);
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const { data: elements    = [] } = useGetElementsQuery();
  const { data: phases      = [] } = useGetPhasesQuery();

  const sheetFull = useMemo<InspectionSheetFull | null>(() => {
    if (!sheet) return null;
    const filial  = filials.find((f) => f.id === sheet.filialId);
    const voltage = voltages.find((v) => v.id === sheet.voltageId);
    const line    = lines.find((l) => l.id === sheet.lineId);
    return {
      ...sheet,
      filialName:  filial?.name  ?? '—',
      voltageName: voltage?.name ?? '—',
      lineName:    line?.name    ?? '—',
      poleStart:   line?.pole_start ?? 1,
      poleEnd:     line?.pole_end   ?? 1,
      poleCount:   line?.pole_count ?? 0,
      activeCount: 0,
      fixedCount:  0,
    };
  }, [sheet, filials, voltages, lines]);

  const defectsFull = useMemo<DefectRecordFull[]>(
    () => allDefects.map((d) => {
      const dt = defectTypes.find((t) => t.id === d.defectId);
      const el = elements.find((e) => dt && e.id === dt.element_id);
      const ph = phases.find((p) => p.id === d.phaseId);
      return {
        ...d,
        elementName: el?.name ?? '—',
        defectName:  dt?.name ?? '—',
        phaseName:   ph?.name ?? null,
        severity:    (dt?.severity ?? 'low') as DefectRecordFull['severity'],
      };
    }),
    [allDefects, defectTypes, elements, phases],
  );

  const fixedCount  = useMemo(() => allDefects.filter((d) => d.isFixed).length, [allDefects]);
  const totalCount  = allDefects.length;
  const fixedPct    = totalCount > 0 ? Math.round((fixedCount / totalCount) * 100) : 0;

  return {
    sheet,
    sheetFull,
    defectsFull,
    fixedPct,
    totalCount,
    isLoading: sheetLoading,
  };
}
