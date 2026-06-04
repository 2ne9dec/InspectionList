import type { DefectRecord } from '@/entities/DefectRecord';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import type { DefectType, Element, Phase } from '@/entities/InspectionLine';
import type ExcelJS from 'exceljs';

interface ExportParams {
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

// ── Палитра ──────────────────────────────────────────────────────────────────
const C = {
  titleBg:    'FF2F4F6F', // приглушённый синий — заголовок
  titleFg:    'FFFFFFFF',
  infoBg:     'FFE8EFF6', // очень светлый голубой
  hdr1Bg:     'FFB8CCE4', // бледно-голубой — заголовки таблицы
  hdr1Fg:     'FF1A2E45', // тёмно-синий текст
  hdr2Bg:     'FFD9E5F2', // ещё светлее — подзаголовки
  hdr2Fg:     'FF1A2E45',
  rowEven:    'FFFFFFFF',
  rowOdd:     'FFECF2FA', // едва заметный голубой
  totalBg:    'FFB8CCE4',
  border:     'FF8DAECE',
  borderDark: 'FF2F4F6F',
} as const;

function fill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function border(style: ExcelJS.BorderStyle = 'thin', argb: string = C.border): Partial<ExcelJS.Borders> {
  const s: ExcelJS.Border = { style, color: { argb } };
  return { top: s, left: s, bottom: s, right: s };
}

export async function exportToExcel(params: ExportParams): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const { sheet, defects, defectTypes, elements, phases = [] } = params;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Журнал дефектов';
  wb.created = new Date();

  const sorted = [...defects].sort((a, b) => (a.poleNumber ?? Infinity) - (b.poleNumber ?? Infinity));

  const ws = wb.addWorksheet('Журнал неисправностей', {
    pageSetup: {
      orientation: 'landscape', paperSize: 9,
      fitToPage: true, fitToWidth: 1, fitToHeight: 0,
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
  ];

  // ── Строка 1: Заголовок ──────────────────────────────────────────────────────
  ws.mergeCells('A1:G1');
  const r1 = ws.getCell('A1');
  r1.value = 'ЖУРНАЛ НЕИСПРАВНОСТЕЙ';
  r1.font = { bold: true, size: 14, name: 'Times New Roman', color: { argb: C.titleFg } };
  r1.fill = fill(C.titleBg);
  r1.alignment = { horizontal: 'center', vertical: 'middle' };
  r1.border = border('medium', C.borderDark);
  ws.getRow(1).height = 28;

  // ── Строка 2: Инфо о линии ───────────────────────────────────────────────────
  ws.mergeCells('A2:G2');
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

  // ── Строки 3–4: Заголовки таблицы ───────────────────────────────────────────
  ws.mergeCells('A3:A4');
  ws.mergeCells('B3:B4');
  ws.mergeCells('C3:C4');
  ws.mergeCells('D3:E3');
  ws.mergeCells('F3:G3');

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

  // Фильтр по всем колонкам (строка 4 — нижний заголовок)
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: 7 } };

  // ── Данные ───────────────────────────────────────────────────────────────────
  sorted.forEach((d, i) => {
    const dt    = defectTypes.find((t) => t.id === d.defectId);
    const el    = elements.find((e) => e.id === dt?.element_id);
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

    const locationLabel  = d.spanRange ? `Пролёт ${d.spanRange}` : `Оп. ${d.poleNumber}`;
    const phasePart      = phase ? ` / ${phase.name}` : '';
    const elPart         = el ? el.name : '';
    const defPart        = dt ? dt.name : '—';
    const insulatorPart  = d.insulatorCount != null ? ` (${d.insulatorCount} шт.)` : '';
    set('C', `${locationLabel}${phasePart}\n${elPart}: ${defPart}${insulatorPart}`);

    set('D', '');
    set('E', '');
    set('F', d.isFixed && d.dateFixed   ? formatDate(d.dateFixed)   : '');
    set('G', d.isFixed && d.inspectorFix ? d.inspectorFix           : '');
  });

  // ── Строка итогов ────────────────────────────────────────────────────────────
  const totalRow = sorted.length + 5;
  ws.mergeCells(`A${totalRow}:G${totalRow}`);
  const tc = ws.getCell(`A${totalRow}`);
  const fixed   = sorted.filter((d) => d.isFixed).length;
  const active  = sorted.filter((d) => !d.isFixed).length;
  tc.value = `Итого: ${sorted.length}   |   Активных: ${active}   |   Устранено: ${fixed}`;
  tc.font  = { bold: true, size: 10, name: 'Times New Roman', color: { argb: 'FF1A2E45' } };
  tc.fill  = fill(C.totalBg);
  tc.alignment = { horizontal: 'center', vertical: 'middle' };
  tc.border = border('medium', C.borderDark);
  ws.getRow(totalRow).height = 20;

  // ── Лист 2: Статистика ───────────────────────────────────────────────────────
  const ws2 = wb.addWorksheet('Статистика');
  ws2.columns = [{ width: 35 }, { width: 35 }, { width: 14 }, { width: 14 }];

  const addHdr2 = (cell: string, v: string) => {
    const c = ws2.getCell(cell);
    c.value = v;
    c.font = { bold: true, name: 'Times New Roman', size: 10, color: { argb: C.hdr1Fg } };
    c.fill = fill(C.hdr1Bg);
    c.border = border('medium', C.borderDark);
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  };
  addHdr2('A1', 'Элемент');
  addHdr2('B1', 'Вид дефекта');
  addHdr2('C1', 'Активных');
  addHdr2('D1', 'Устранено');
  ws2.getRow(1).height = 22;

  const statMap = new Map<string, { elem: string; defect: string; active: number; fixed: number }>();
  for (const d of defects) {
    const dt  = defectTypes.find((t) => t.id === d.defectId);
    const el  = elements.find((e) => dt && e.id === dt.element_id);
    const key = `${dt?.element_id ?? 0}_${d.defectId}`;
    if (!statMap.has(key)) statMap.set(key, { elem: el?.name ?? '—', defect: dt?.name ?? '—', active: 0, fixed: 0 });
    const row = statMap.get(key)!;
    if (!d.isFixed) row.active++; else row.fixed++;
  }
  const statRows = [...statMap.values()].sort((a, b) => b.active - a.active);
  statRows.forEach((row, i) => {
    const r = i + 2;
    ws2.getCell(`A${r}`).value = row.elem;
    ws2.getCell(`B${r}`).value = row.defect;
    ws2.getCell(`C${r}`).value = row.active;
    ws2.getCell(`D${r}`).value = row.fixed;
    ['A', 'B', 'C', 'D'].forEach((col) => {
      const c = ws2.getCell(`${col}${r}`);
      c.font  = { name: 'Times New Roman', size: 10 };
      c.border = border('thin');
      c.fill  = fill(i % 2 === 0 ? C.rowEven : C.rowOdd);
      c.alignment = { vertical: 'middle', wrapText: true };
    });
    ws2.getRow(r).height = 18;
  });

  const s2tot = statRows.length + 2;
  ws2.mergeCells(`A${s2tot}:B${s2tot}`);
  ws2.getCell(`A${s2tot}`).value = 'ИТОГО';
  ws2.getCell(`C${s2tot}`).value = statRows.reduce((s, r) => s + r.active, 0);
  ws2.getCell(`D${s2tot}`).value = statRows.reduce((s, r) => s + r.fixed, 0);
  ['A', 'C', 'D'].forEach((col) => {
    const c = ws2.getCell(`${col}${s2tot}`);
    c.font  = { bold: true, name: 'Times New Roman', size: 10 };
    c.fill  = fill(C.totalBg);
    c.border = border('medium', C.borderDark);
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  ws2.getRow(s2tot).height = 20;

  // ── Лист 3: Сводка ───────────────────────────────────────────────────────────
  const ws3 = wb.addWorksheet('Сводка');
  ws3.columns = [{ width: 32 }, { width: 28 }];
  let ws3Row = 0;
  const addSummary = (label: string, value: string | number, isTitle = false) => {
    ws3Row++;
    const cA = ws3.getCell(`A${ws3Row}`);
    const cB = ws3.getCell(`B${ws3Row}`);
    cA.value = label;
    cB.value = value;
    [cA, cB].forEach((c, idx) => {
      c.font   = { name: 'Times New Roman', size: 11, bold: idx === 0 || isTitle };
      c.border = border('thin');
      c.fill   = fill(isTitle ? C.hdr1Bg : (ws3Row % 2 === 0 ? C.rowOdd : C.rowEven));
      if (isTitle) c.font = { ...c.font, color: { argb: C.hdr1Fg } };
      c.alignment = { vertical: 'middle' };
    });
    ws3.getRow(ws3Row).height = 18;
  };
  addSummary('Филиал',              sheet.filialName);
  addSummary('Класс напряжения',    sheet.voltageName);
  addSummary('Линия',               sheet.lineName);
  addSummary('Дата осмотра',        sheet.createdDate);
  addSummary('Инспектор',           sheet.createdBy);
  addSummary('Всего дефектов',      defects.length);
  addSummary('Активных',            defects.filter((d) => !d.isFixed).length);
  addSummary('Устранено',           defects.filter((d) => d.isFixed).length);
  addSummary('Мест с дефектами',    new Set(defects.map((d) => d.spanRange ?? String(d.poleNumber))).size);

  // ── Скачиваем ────────────────────────────────────────────────────────────────
  const buf      = await wb.xlsx.writeBuffer();
  const safeName = sheet.lineName.replace(/[<>:"/\\|?*]/g, '_').substring(0, 50);
  const fileName = `Журнал_${safeName}_${sheet.createdDate}.xlsx`;

  // На Android (Capacitor) — сохраняем во временный кеш и открываем диалог «Поделиться»
  const isCapacitor = typeof (window as any).Capacitor !== 'undefined' &&
    (window as any).Capacitor?.isNativePlatform?.();

  if (isCapacitor) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    const base64 = btoa(
      new Uint8Array(buf as ArrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
    );

    // Пишем во временную папку
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Cache,
    });

    // Открываем нативный диалог — пользователь сам выбирает куда сохранить
    await Share.share({
      title: fileName,
      url: result.uri,
      dialogTitle: 'Сохранить или отправить файл',
    });
    return;
  }

  // На вебе — стандартное скачивание через ссылку
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
