import { memo, useState } from 'react';
import { useGetDefectsBySheetQuery } from '@/entities/DefectRecord';
import { useGetDefectTypesQuery, useGetElementsQuery, useGetPhasesQuery } from '@/entities/InspectionLine';
import type { InspectionSheetFull } from '@/entities/InspectionSheet';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';
import { exportToExcel } from '../lib/excelExporter';
import { IconDownload } from '@/shared/ui/Icons';
import cls from './ExportButton.module.scss';

interface ExportButtonProps {
  sheet: InspectionSheetFull;
}

export const ExportButton = memo((props: ExportButtonProps) => {
  const { sheet } = props;
  const [isExporting, setIsExporting] = useState(false);

  const { data: defects = [] } = useGetDefectsBySheetQuery(sheet.id);
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const { data: elements = [] } = useGetElementsQuery();
  const { data: phases = [] } = useGetPhasesQuery();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportToExcel({
        sheet: {
          filialName: sheet.filialName,
          voltageName: sheet.voltageName,
          lineName: sheet.lineName,
          createdDate: sheet.createdDate,
          createdBy: sheet.createdBy,
        },
        defects,
        defectTypes,
        elements,
        phases,
      });
      toast.success('Экспорт в Excel готов');
    } catch (e) {
      logger.error('ExportToExcel failed', e);
      toast.error('Ошибка при экспорте. Проверьте, что пакет exceljs установлен (yarn add exceljs).');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button className={cls.btn} onClick={handleExport} disabled={isExporting}>
      <span className={cls.icon}><IconDownload size={14} /></span>
      {isExporting ? 'Экспорт...' : 'Экспорт в Excel'}
    </button>
  );
});

ExportButton.displayName = 'ExportButton';
