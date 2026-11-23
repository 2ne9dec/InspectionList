import type { DefectRecordFull } from '../model/types';

export interface DefectFilterValues {
  elementId: string;
  defectTypeId: string;
  search: string;
}

/**
 * Фильтрация обогащённых дефектов по элементу, виду и тексту.
 * Map «defectTypeId → elementId» передаётся снаружи, чтобы не строить его на каждый вызов.
 */
export function filterDefectRows(
  rows: ReadonlyArray<DefectRecordFull>,
  filters: DefectFilterValues,
  defectElementMap: ReadonlyMap<number, string>,
): DefectRecordFull[] {
  const query = filters.search.trim().toLowerCase();

  return rows.filter((row) => {
    if (filters.elementId && defectElementMap.get(row.defectId) !== filters.elementId) return false;
    if (filters.defectTypeId && String(row.defectId) !== filters.defectTypeId) return false;
    if (query) {
      return (
        row.defectName.toLowerCase().includes(query) ||
        row.elementName.toLowerCase().includes(query) ||
        String(row.poleNumber).includes(query) ||
        row.inspectorFind.toLowerCase().includes(query)
      );
    }
    return true;
  });
}
