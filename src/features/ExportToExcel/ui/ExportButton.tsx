import { memo, useState } from 'react';
import { useGetDefectsBySheetQuery } from '@/entities/DefectRecord';
import { useGetDefectTypesQuery, useGetElementsQuery, useGetPhasesQuery } from '@/entities/InspectionLine';
import type { InspectionSheetFull } from '@/entities/InspectionSheet';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';
import { exportToExcel } from '../lib/excelExporter';
import { Button } from '@/shared/ui';
import { IconDownload } from '@/shared/ui/Icons';

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
    <Button
      variant='secondary'
      size='s'
      loading={isExporting}
      leftIcon={<IconDownload size={14} />}
      onClick={handleExport}
    >
      {isExporting ? 'Экспорт...' : 'Экспорт в Excel'}
    </Button>
  );
});

ExportButton.displayName = 'ExportButton';
