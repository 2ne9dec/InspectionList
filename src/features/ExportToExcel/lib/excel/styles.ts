import type ExcelJS from 'exceljs';

/** Палитра журнала. */
export const C = {
  titleBg:    'FF2F4F6F',
  titleFg:    'FFFFFFFF',
  infoBg:     'FFE8EFF6',
  hdr1Bg:     'FFB8CCE4',
  hdr1Fg:     'FF1A2E45',
  hdr2Bg:     'FFD9E5F2',
  hdr2Fg:     'FF1A2E45',
  rowEven:    'FFFFFFFF',
  rowOdd:     'FFECF2FA',
  totalBg:    'FFB8CCE4',
  border:     'FF8DAECE',
  borderDark: 'FF2F4F6F',
} as const;

export function fill(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

export function border(
  style: ExcelJS.BorderStyle = 'thin',
  argb: string = C.border,
): Partial<ExcelJS.Borders> {
  const s: ExcelJS.Border = { style, color: { argb } };
  return { top: s, left: s, bottom: s, right: s };
}
