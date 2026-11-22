import type { DefectRecord } from '../model/types';
import type { DefectType, Element, Phase } from '@/entities/InspectionLine';

/** Человекочитаемое место дефекта: «Пр. 47-48 / A / Опора: трещина». */
export function formatDefectLocation(
  d: Pick<DefectRecord, 'poleNumber' | 'spanRange' | 'customName'>,
  defectType: DefectType | undefined,
  element: Element | undefined,
  phase: Phase | undefined,
): string {
  const defectName = d.customName?.trim() || defectType?.name;
  return [
    d.spanRange ? `Пр. ${d.spanRange}` : d.poleNumber ? `Оп. ${d.poleNumber}` : null,
    phase?.name ?? null,
    element && defectType
      ? `${element.name}: ${defectName}`
      : defectName ?? null,
  ].filter(Boolean).join(' / ');
}
