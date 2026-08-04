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
  filialId?: number | null;
  /** Диапазон опор, например "1-186". Null для SAP-линий без ручного ввода */
  poleRange?: string | null;
  poleStart?: number | null;
  poleEnd?: number | null;
  poleCount?: number | null;
  /** Год ввода в эксплуатацию */
  yearBuilt?: number | null;
  /** Год последнего капитального ремонта */
  yearLastOverhaul?: number | null;
  /** Протяжённость линии, км */
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

export interface Phase {
  id: number;
  name: string;
}

export interface DefectTreeNode {
  element: Element;
  defects: DefectType[];
}
