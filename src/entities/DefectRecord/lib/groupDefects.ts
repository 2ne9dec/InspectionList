import type { DefectRecordFull } from '../model/types';

export interface DefectSubGroup {
  key: string;
  ids: number[];
  first: DefectRecordFull;
  phases: string;
  phaseItems: { id: number; name: string }[];
  insulatorCount: number | null;
  garlandNumber: number | null;
}

/**
 * Группирует дефекты одной опоры/пролёта по комбинации
 * элемент + дефект + фаза + изоляторы + гирлянда.
 * Внутри группы — сортировка по порядку добавления и фазе.
 */
export function groupDefectRows(records: DefectRecordFull[]): DefectSubGroup[] {
  const map = new Map<string, DefectSubGroup>();

  for (const r of records) {
    const phaseKey = r.phaseId != null ? String(r.phaseId) : 'null';
    const insulatorKey = r.insulatorCount != null ? String(r.insulatorCount) : 'null';
    const garlandKey = r.garlandNumber != null ? String(r.garlandNumber) : 'null';
    const key = `${r.elementName}||${r.defectName}||${phaseKey}||${insulatorKey}||${garlandKey}`;
    const existing = map.get(key);
    if (existing) {
      existing.ids.push(r.id);
    } else {
      map.set(key, {
        key,
        ids: [r.id],
        first: r,
        phases: '',
        phaseItems: r.phaseName && r.phaseId !== null ? [{ id: r.phaseId, name: r.phaseName }] : [],
        insulatorCount: r.insulatorCount ?? null,
        garlandNumber: r.garlandNumber ?? null,
      });
    }
  }

  const groups = Array.from(map.values());

  // Сортировка по порядку первого добавления (мин. id), затем по фазе.
  const firstIdByType = new Map<string, number>();
  for (const g of groups) {
    const ek = `${g.first.elementName}||${g.first.defectName}`;
    const minId = Math.min(...g.ids);
    if (!firstIdByType.has(ek) || firstIdByType.get(ek)! > minId) firstIdByType.set(ek, minId);
  }

  groups.sort((a, b) => {
    const ekA = `${a.first.elementName}||${a.first.defectName}`;
    const ekB = `${b.first.elementName}||${b.first.defectName}`;
    const fA = firstIdByType.get(ekA) ?? 0;
    const fB = firstIdByType.get(ekB) ?? 0;
    if (fA !== fB) return fA - fB;
    return (a.first.phaseName ?? '').localeCompare(b.first.phaseName ?? '');
  });

  for (const g of groups) {
    g.phaseItems.sort((a, b) => a.id - b.id);
    g.phases = g.phaseItems.map((p) => p.name).join(', ');
  }

  return groups;
}
