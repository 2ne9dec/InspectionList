import type { Severity } from '@/shared/const/severity';
export interface Filial {
  id: number;
  name: string;
}

export interface Voltage {
  id: number;
  name: string;
  filial_id: number;
}

export interface Line {
  id: number;
  name: string;
  voltage_id: number;
  pole_range: string;
  pole_start: number;
  pole_end: number;
  pole_count: number;
  /** Год ввода в эксплуатацию */
  year_built?: number | null;
  /** Год последнего капитального ремонта */
  year_last_overhaul?: number | null;
  /** Протяжённость линии, км (опционально, вручную) */
  length_km?: number | null;
  /** Тип опор: деревянные, железобетонные, металлические */
  pole_type?: string | null;
  /** Марка провода */
  wire_type?: string | null;
  /** Дополнительные примечания */
  notes?: string | null;
}

export interface Element {
  id: number;
  name: string;
}

export interface DefectType {
  id: number;
  name: string;
  element_id: number;
  severity: Severity;
}

// Фаза провода или грозотрос — выбирается при добавлении дефекта
// для элементов из списка phaseElementIds
export interface Phase {
  id: number;
  name: string; // "Фаза A", "Фаза B", "Фаза C", "Грозотрос"
}

export interface DefectTreeNode {
  element: Element;
  defects: DefectType[];
}


