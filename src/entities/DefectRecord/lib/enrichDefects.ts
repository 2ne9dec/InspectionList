import type { DefectRecord, DefectRecordFull } from '../model/types';
import type { DefectType, Element, Phase } from '@/entities/InspectionLine';

/**
 * Обогащает записи дефектов именами элемента, вида дефекта и фазы.
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
    // Для «Линейной арматуры» пользователь вписывает дефект сам — показываем его текст
    const customName = d.customName?.trim();
    return {
      ...d,
      elementName: el?.name ?? '\u2014',
      defectName: customName || dt?.name || '\u2014',
      phaseName: phase?.name ?? null,
    };
  });
}
