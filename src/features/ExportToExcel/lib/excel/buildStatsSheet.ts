import type ExcelJS from 'exceljs';
import { C, border, fill } from './styles';
import type { ExportParams } from './types';

/** Лист 2: статистика по элементам и видам дефектов. */
export function buildStatsSheet(
  wb: ExcelJS.Workbook,
  { defects, defectTypes, elements }: ExportParams,
): void {
  const ws = wb.addWorksheet('Статистика');
  ws.columns = [{ width: 35 }, { width: 35 }, { width: 14 }, { width: 14 }];

  const addHdr = (cell: string, v: string) => {
    const c = ws.getCell(cell);
    c.value = v;
    c.font = { bold: true, name: 'Times New Roman', size: 10, color: { argb: C.hdr1Fg } };
    c.fill = fill(C.hdr1Bg);
    c.border = border('medium', C.borderDark);
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  };

  addHdr('A1', 'Элемент');
  addHdr('B1', 'Вид дефекта');
  addHdr('C1', 'Активных');
  addHdr('D1', 'Устранено');
  ws.getRow(1).height = 22;

  const statMap = new Map<string, { elem: string; defect: string; active: number; fixed: number }>();
  for (const d of defects) {
    const dt = defectTypes.find((t) => t.id === d.defectId);
    const el = elements.find((e) => dt && e.id === dt.elementId);
    const defectName = d.customName?.trim() || dt?.name || '—';
    // Свои дефекты «Линейной арматуры» считаем отдельно по введённому тексту.
    const key = d.customName?.trim()
      ? `${dt?.elementId ?? 0}_custom_${defectName}`
      : `${dt?.elementId ?? 0}_${d.defectId}`;
    if (!statMap.has(key)) {
      statMap.set(key, { elem: el?.name ?? '—', defect: defectName, active: 0, fixed: 0 });
    }
    const row = statMap.get(key)!;
    if (!d.isFixed) row.active++;
    else row.fixed++;
  }

  const statRows = [...statMap.values()].sort((a, b) => b.active - a.active);
  statRows.forEach((row, i) => {
    const r = i + 2;
    ws.getCell(`A${r}`).value = row.elem;
    ws.getCell(`B${r}`).value = row.defect;
    ws.getCell(`C${r}`).value = row.active;
    ws.getCell(`D${r}`).value = row.fixed;
    ['A', 'B', 'C', 'D'].forEach((col) => {
      const c = ws.getCell(`${col}${r}`);
      c.font = { name: 'Times New Roman', size: 10 };
      c.border = border('thin');
      c.fill = fill(i % 2 === 0 ? C.rowEven : C.rowOdd);
      c.alignment = { vertical: 'middle', wrapText: true };
    });
    ws.getRow(r).height = 18;
  });

  const totRow = statRows.length + 2;
  ws.mergeCells(`A${totRow}:B${totRow}`);
  ws.getCell(`A${totRow}`).value = 'ИТОГО';
  ws.getCell(`C${totRow}`).value = statRows.reduce((s, r) => s + r.active, 0);
  ws.getCell(`D${totRow}`).value = statRows.reduce((s, r) => s + r.fixed, 0);
  ['A', 'C', 'D'].forEach((col) => {
    const c = ws.getCell(`${col}${totRow}`);
    c.font = { bold: true, name: 'Times New Roman', size: 10 };
    c.fill = fill(C.totalBg);
    c.border = border('medium', C.borderDark);
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  ws.getRow(totRow).height = 20;
}
