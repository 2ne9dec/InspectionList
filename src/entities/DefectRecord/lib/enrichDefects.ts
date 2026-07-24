import type { DefectRecord, DefectRecordFull } from '../model/types';
import type { DefectType, Element, Phase } from '@/entities/InspectionLine';
import type { Severity } from '@/shared/const/severity';

/**
 * Обогащает записи дефектов именами элемента, вида дефекта, фазы и severity.
 * Использует Map для O(n) вместо O(n²) при большом числе записей.
 */
export function enrichDefects(
  records: ReadonlyArray<DefectRecord>,
  defectTypes: ReadonlyArray<DefectType>,
  elements: ReadonlyArray<Element>,
  phases: ReadonlyArray<Phase>,
): DefectRecordFull[] {
  const dtById = new Map(defectTypes.map((t) => [t.id, t]));
  const elById = new Map(elements.map((e) => [e.id, e]));
  const phById = new Map(phases.map((p) => [p.id, p]));

  return records.map((d) => {
    const dt = dtById.get(d.defectId);
    const el = dt ? elById.get(dt.elementId) : undefined;
    const phase = d.phaseId !== null ? phById.get(d.phaseId) : undefined;
    return {
      ...d,
      elementName: el?.name ?? '\u2014',
      defectName: dt?.name ?? '\u2014',
      phaseName: phase?.name ?? null,
      severity: (dt?.severity ?? 'low') as Severity,
    };
  });
}
