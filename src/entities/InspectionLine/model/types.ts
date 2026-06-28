import type { Severity } from '@/shared/const/severity';
export interface Filial {
  id: number;
  name: string;
}

export interface Voltage {
  id: number;
  name: string;
  filialId: number;
}

export interface Line {
  id: number;
  name: string;
  voltageId: number;
  poleRange: string;
  poleStart: number;
  poleEnd: number;
  poleCount: number;
  /** Год ввода в эксплуатацию */
  yearBuilt?: number | null;
  /** Год последнего капитального ремонта */
  yearLastOverhaul?: number | null;
  /** Протяжённость линии, км (опционально, вручную) */
  lengthKm?: number | null;
  /** Тип опор: деревянные, железобетонные, металлические */
  poleType?: string | null;
  /** Марка провода */
  wireType?: string | null;
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
  elementId: number;
  severity: Severity;
}

// Фаза провода или грозотрос — выбирается при добавлении дефекта
// для элементов из списка phaseElementIds
export interface Phase {
  id: number;
  name: string; // "провод 1", "провод 2", "провод 3", "Грозотрос"
}

export interface DefectTreeNode {
  element: Element;
  defects: DefectType[];
}


