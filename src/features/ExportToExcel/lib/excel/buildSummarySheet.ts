import type ExcelJS from 'exceljs';
import { C, border, fill } from './styles';
import type { ExportParams } from './types';

/** Лист 3: сводка по листку. */
export function buildSummarySheet(
  wb: ExcelJS.Workbook,
  { sheet, defects }: ExportParams,
): void {
  const ws = wb.addWorksheet('Сводка');
  ws.columns = [{ width: 32 }, { width: 28 }];
  let rowIdx = 0;

  const addRow = (label: string, value: string | number, isTitle = false) => {
    rowIdx++;
    const cA = ws.getCell(`A${rowIdx}`);
    const cB = ws.getCell(`B${rowIdx}`);
    cA.value = label;
    cB.value = value;
    [cA, cB].forEach((c, idx) => {
      c.font = { name: 'Times New Roman', size: 11, bold: idx === 0 || isTitle };
      c.border = border('thin');
      c.fill = fill(isTitle ? C.hdr1Bg : (rowIdx % 2 === 0 ? C.rowOdd : C.rowEven));
      if (isTitle) c.font = { ...c.font, color: { argb: C.hdr1Fg } };
      c.alignment = { vertical: 'middle' };
    });
    ws.getRow(rowIdx).height = 18;
  };

  addRow('Филиал', sheet.filialName);
  addRow('Класс напряжения', sheet.voltageName);
  addRow('Линия', sheet.lineName);
  addRow('Дата осмотра', sheet.createdDate);
  addRow('Инспектор', sheet.createdBy);
  addRow('Всего дефектов', defects.length);
  addRow('Активных', defects.filter((d) => !d.isFixed).length);
  addRow('Устранено', defects.filter((d) => d.isFixed).length);
  addRow('Мест с дефектами', new Set(defects.map((d) => d.spanRange ?? String(d.poleNumber))).size);
}
