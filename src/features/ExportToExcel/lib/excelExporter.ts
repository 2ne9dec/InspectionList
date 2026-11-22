import { buildJournalSheet } from './excel/buildJournalSheet';
import { buildStatsSheet } from './excel/buildStatsSheet';
import { buildSummarySheet } from './excel/buildSummarySheet';
import { downloadWorkbook } from './excel/downloadWorkbook';
import type { ExportParams } from './excel/types';

/** Сборка и сохранение журнала дефектов в Excel. */
export async function exportToExcel(params: ExportParams): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const { sheet, defects } = params;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Журнал дефектов';
  wb.created = new Date();

  const sorted = [...defects].sort((a, b) => (a.poleNumber ?? Infinity) - (b.poleNumber ?? Infinity));

  buildJournalSheet(wb, params, sorted);
  buildStatsSheet(wb, params);
  buildSummarySheet(wb, params);

  const buf = await wb.xlsx.writeBuffer();
  const safeName = sheet.lineName.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
  const fileName = `Журнал_${safeName}_${sheet.createdDate}.xlsx`;

  await downloadWorkbook(buf, fileName);
}
