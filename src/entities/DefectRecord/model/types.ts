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
  garlandNumber?: number | null;
  createdAt?: string | null;
  masterConclusion?: string | null;
  resolutionDeadline?: string | null;
  masterName?: string | null;
  fixWorkVolume?: string | null;
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
  notes?: string | null;
  insulatorCount?: number | null;
  spanRange?: string | null;
  garlandNumber?: number | null;
}

export interface FixDefectParams {
  id: number;
  dateFixed: string;
  inspectorFix: string;
  isFixed: boolean;
  masterConclusion?: string | null;
  resolutionDeadline?: string | null;
  masterName?: string | null;
  fixWorkVolume?: string | null;
}

export interface DefectCount {
  sheetId: number;
  active: number;
  fixed: number;
}
