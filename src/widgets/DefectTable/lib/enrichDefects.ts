import type { DefectRecord, DefectRecordFull } from '@/entities/DefectRecord';
import { getLocationKey } from '@/entities/DefectRecord';
import type { DefectType, Element, Phase, Severity } from '@/entities/InspectionLine';

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
      elementName: el?.name ?? '—',
      defectName: dt?.name ?? '—',
      phaseName: phase?.name ?? null,
      severity: (dt?.severity ?? 'low') as Severity,
    };
  });
}

export function groupByLocation(
  records: ReadonlyArray<DefectRecordFull>,
  dir: 'asc' | 'desc' = 'asc',
): Array<[string, DefectRecordFull[]]> {
  const map = new Map<string, DefectRecordFull[]>();
  for (const r of records) {
    const key = getLocationKey(r);
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }

  return Array.from(map.entries()).sort(([a], [b]) => {
    // Опоры сортируем по числу, Пролётыы — лексикографически
    const aNum = a.startsWith('о:') ? Number(a.slice(2)) : NaN;
    const bNum = b.startsWith('о:') ? Number(b.slice(2)) : NaN;
    if (!isNaN(aNum) && !isNaN(bNum)) return dir === 'asc' ? aNum - bNum : bNum - aNum;
    return dir === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
  });
}

/** Псевдоним для обратной совместимости */
export const groupByPole = groupByLocation;
