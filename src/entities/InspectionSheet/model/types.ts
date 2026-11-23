export type SheetStatus = 'active' | 'archived' | 'draft' | 'pending';

export interface InspectionSheet {
  id: number;
  filialId: number;
  voltageId: number;
  lineId: number;
  createdDate: string; // ISO: "2026-05-11"
  createdBy: string;
  /** Кто осматривал; при объединении — все исходные ФИО через запятую. */
  inspectors?: string | null;
  /** Кто объединил листки (только у объединённых). */
  mergedBy?: string | null;
  status: SheetStatus;
  /** ID листков, из которых был создан этот сводный листок */
  mergedFromIds?: number[] | null;
}

// Обогащённая версия с именами из справочников (для отображения)
export interface InspectionSheetFull extends InspectionSheet {
  filialName: string;
  voltageName: string;
  lineName: string;
  poleStart: number;
  poleEnd: number;
  poleCount: number;
  activeCount: number;
  fixedCount: number;
}
