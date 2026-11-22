import type ExcelJS from 'exceljs';
import type { DefectRecord } from '@/entities/DefectRecord';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import { C, border, fill } from './styles';
import type { ExportParams } from './types';

/** Лист 1: журнал неисправностей. */
export function buildJournalSheet(
  wb: ExcelJS.Workbook,
  { sheet, defectTypes, elements, phases = [] }: ExportParams,
  sorted: DefectRecord[],
): void {
  const ws = wb.addWorksheet('Журнал неисправностей', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
    },
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  ws.columns = [
    { width: 16 }, // A — Дата обнаружения
    { width: 22 }, // B — ФИО обнаружившего
    { width: 58 }, // C — Место (опора/пролёт, фаза, элемент, дефект)
    { width: 28 }, // D — Мероприятия по устранению
    { width: 20 }, // E — Срок устранения, ФИО
    { width: 28 }, // F — Дата устранения, объём работ
    { width: 22 }, // G — ФИО производителя работ
    { width: 20 }, // H — SAP-код опоры
  ];

  ws.mergeCells('A1:H1');
  const r1 = ws.getCell('A1');
  r1.value = 'ЖУРНАЛ НЕИСПРАВНОСТЕЙ';
  r1.font = { bold: true, size: 14, name: 'Times New Roman', color: { argb: C.titleFg } };
  r1.fill = fill(C.titleBg);
  r1.alignment = { horizontal: 'center', vertical: 'middle' };
  r1.border = border('medium', C.borderDark);
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:H2');
  const r2 = ws.getCell('A2');
  r2.value = [
    sheet.filialName,
    sheet.voltageName,
    `ВЛ: ${sheet.lineName}`,
    `Дата осмотра: ${formatDate(sheet.createdDate)}`,
    `Осматривал: ${sheet.createdBy}`,
  ].join('   |   ');
  r2.font = { size: 10, italic: true, name: 'Times New Roman' };
  r2.fill = fill(C.infoBg);
  r2.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  r2.border = border('thin', C.borderDark);
  ws.getRow(2).height = 18;

  ws.mergeCells('A3:A4');
  ws.mergeCells('B3:B4');
  ws.mergeCells('C3:C4');
  ws.mergeCells('D3:E3');
  ws.mergeCells('F3:G3');
  ws.mergeCells('H3:H4');

  const hdr1 = (cell: ExcelJS.Cell, text: string, rotate = false) => {
    cell.value = text;
    cell.font = { bold: true, size: 10, name: 'Times New Roman', color: { argb: C.hdr1Fg } };
    cell.fill = fill(C.hdr1Bg);
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true, textRotation: rotate ? 90 : 0 };
    cell.border = border('thin', C.borderDark);
  };

  hdr1(ws.getCell('A3'), 'Дата обнаружения', true);
  hdr1(ws.getCell('B3'), 'Ф.И.О. обнаружившего', true);
  hdr1(ws.getCell('C3'), 'Место обнаружения неисправности\n(опора/пролёт / фаза / элемент: дефект)');
  hdr1(ws.getCell('D3'), 'Заключение мастера по устранению');
  hdr1(ws.getCell('F3'), 'Информация об устранении неисправностей');
  hdr1(ws.getCell('H3'), 'SAP-код опоры');
  ws.getRow(3).height = 60;

  const hdr2 = (cell: ExcelJS.Cell, text: string) => {
    cell.value = text;
    cell.font = { size: 9, name: 'Times New Roman', color: { argb: C.hdr2Fg } };
    cell.fill = fill(C.hdr2Bg);
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = border('thin', C.borderDark);
  };

  hdr2(ws.getCell('D4'), 'мероприятия по устранению');
  hdr2(ws.getCell('E4'), 'срок устранения, Ф.И.О.');
  hdr2(ws.getCell('F4'), 'дата устранения, объём работ');
  hdr2(ws.getCell('G4'), 'Ф.И.О. производителя работ');
  ws.getRow(4).height = 36;

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 8 } };

  sorted.forEach((d, i) => {
    const dt = defectTypes.find((t) => t.id === d.defectId);
    const el = elements.find((e) => e.id === dt?.elementId);
    const phase = phases.find((p) => p.id === d.phaseId);

    const rowNum = i + 5;
    ws.getRow(rowNum).height = 38;
    const bgFill = fill(i % 2 === 0 ? C.rowEven : C.rowOdd);

    const set = (col: string, value: string | number, align: Partial<ExcelJS.Alignment> = {}) => {
      const cell = ws.getCell(`${col}${rowNum}`);
      cell.value = value;
      cell.fill = bgFill;
      cell.font = { size: 11, name: 'Times New Roman' };
      cell.alignment = { vertical: 'middle', wrapText: true, ...align };
      cell.border = border('thin');
    };

    set('A', formatDate(d.dateFound), { horizontal: 'center' });
    set('B', d.inspectorFind);

    const locationLabel = d.spanRange ? `Пролёт ${d.spanRange}` : `Оп. ${d.poleNumber}`;
    const phasePart = phase ? ` / ${phase.name}` : '';
    const elPart = el ? el.name : '';
    const defPart = d.customName?.trim() || (dt ? dt.name : '—');
    const insulatorPart = d.insulatorCount != null ? ` (${d.insulatorCount} шт.)` : '';
    set('C', `${locationLabel}${phasePart}\n${elPart}: ${defPart}${insulatorPart}`);

    set('D', '');
    set('E', '');
    set('F', d.isFixed && d.dateFixed ? formatDate(d.dateFixed) : '');
    set('G', d.isFixed && d.inspectorFix ? d.inspectorFix : '');
    set('H', d.sapCode ?? '');
  });

  const totalRow = sorted.length + 5;
  ws.mergeCells(`A${totalRow}:H${totalRow}`);
  const tc = ws.getCell(`A${totalRow}`);
  const fixed = sorted.filter((d) => d.isFixed).length;
  const active = sorted.filter((d) => !d.isFixed).length;
  tc.value = `Итого: ${sorted.length}   |   Активных: ${active}   |   Устранено: ${fixed}`;
  tc.font = { bold: true, size: 10, name: 'Times New Roman', color: { argb: C.hdr1Fg } };
  tc.fill = fill(C.totalBg);
  tc.alignment = { horizontal: 'center', vertical: 'middle' };
  tc.border = border('medium', C.borderDark);
  ws.getRow(totalRow).height = 20;
}
