export type SheetStatus = 'active' | 'archived' | 'draft';

export interface InspectionSheet {
  id: number;
  filialId: number;
  voltageId: number;
  lineId: number;
  createdDate: string; // ISO: "2026-05-11"
  createdBy: string;
  status: SheetStatus;
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
