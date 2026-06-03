import type { Severity } from '@/shared/const/severity';

export interface DefectRecord {
  id: number;
  sheetId: number;
  poleNumber: number;
  defectId: number;
  phaseId: number | null;
  dateFound: string;
  inspectorFind: string;
  dateFixed: string | null;
  inspectorFix: string | null;
  isFixed: boolean;
  notes?: string | null;
  insulatorCount?: number | null;
  spanRange?: string | null;
}

export interface DefectRecordFull extends DefectRecord {
  elementName: string;
  defectName: string;
  phaseName: string | null;
  severity: Severity;
}

export interface CreateDefectParams {
  sheetId: number;
  poleNumber: number;
  defectId: number;
  phaseId: number | null;
  dateFound: string;
  inspectorFind: string;
  isFixed: boolean;
  dateFixed: null;
  inspectorFix: null;
  notes?: string | null;
  insulatorCount?: number | null;
  spanRange?: string | null;
}

export interface FixDefectParams {
  id: number;
  dateFixed: string;
  inspectorFix: string;
  isFixed: true;
}

export interface DefectCount {
  sheetId: number;
  active: number;
  fixed: number;
}
