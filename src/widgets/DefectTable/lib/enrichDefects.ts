import type { DefectRecordFull } from '@/entities/DefectRecord';
import { getLocationKey } from '@/entities/DefectRecord';

// enrichDefects перенесён в entities — ре-экспорт для обратной совместимости
export { enrichDefects } from '@/entities/DefectRecord';

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
    const aNum = a.startsWith('о:') ? Number(a.slice(2)) : NaN;
    const bNum = b.startsWith('о:') ? Number(b.slice(2)) : NaN;
    if (!isNaN(aNum) && !isNaN(bNum)) return dir === 'asc' ? aNum - bNum : bNum - aNum;
    return dir === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
  });
}

/** Псевдоним для обратной совместимости */
export const groupByPole = groupByLocation;
