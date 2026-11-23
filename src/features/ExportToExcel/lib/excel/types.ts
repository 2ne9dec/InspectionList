import type { DefectRecord } from '@/entities/DefectRecord';
import type { DefectType, Element, Phase } from '@/entities/InspectionLine';

export interface ExportParams {
  sheet: {
    filialName: string;
    voltageName: string;
    lineName: string;
    createdDate: string;
    createdBy: string;
  };
  defects: DefectRecord[];
  defectTypes: DefectType[];
  elements: Element[];
  phases?: Phase[];
}
