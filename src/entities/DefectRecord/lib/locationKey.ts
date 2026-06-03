import type { DefectRecord } from '../model/types';

/**
 * Ключ группировки дефекта: "п:250-300" для Пролётыа, "о:253" для опоры.
 */
export function getLocationKey(d: Pick<DefectRecord, 'poleNumber' | 'spanRange'>): string {
  if (d.spanRange) return `п:${d.spanRange}`;
  return `о:${d.poleNumber}`;
}

/** Человекочитаемая метка ключа */
export function formatLocationLabel(key: string): string {
  return key.slice(2); // убираем "о:" или "п:"
}

/** Тип локации */
export function locationKeyType(key: string): 'span' | 'pole' {
  return key.startsWith('п:') ? 'span' : 'pole';
}
