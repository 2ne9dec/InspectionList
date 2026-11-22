import ExcelJS from 'exceljs';
import type { Worksheet } from 'exceljs';
import { describe, expect, it } from 'vitest';
import { makeDefect } from '@tests/factories';
import { buildSummarySheet } from './buildSummarySheet';
import type { ExportParams } from './types';

const params: ExportParams = {
  sheet: {
    filialName: 'Гомельские ЭС',
    voltageName: 'ВЛ 110 кВ',
    lineName: 'Линия 1',
    createdDate: '2026-01-15',
    createdBy: 'Иванов И.И.',
  },
  defects: [],
  defectTypes: [],
  elements: [],
};

const text = (ws: Worksheet, address: string): string => {
  const value = ws.getCell(address).value;
  return value == null ? '' : String(value);
};

const build = (defects: ExportParams['defects']) => {
  const wb = new ExcelJS.Workbook();
  buildSummarySheet(wb, { ...params, defects });
  const ws = wb.getWorksheet('Сводка');
  expect(ws).toBeDefined();
  return ws!;
};

describe('buildSummarySheet', () => {
  it('выводит сведения о листке и счётчики дефектов', () => {
    const ws = build([
      makeDefect({ id: 1, poleNumber: 1, spanRange: null, isFixed: false }),
      makeDefect({ id: 2, poleNumber: 2, spanRange: null, isFixed: true }),
      makeDefect({ id: 3, poleNumber: 0, spanRange: '5-6', isFixed: false }),
      makeDefect({ id: 4, poleNumber: 0, spanRange: '5-6', isFixed: false }),
    ]);

    expect(text(ws, 'A1')).toBe('Филиал');
    expect(text(ws, 'B1')).toBe('Гомельские ЭС');
    expect(text(ws, 'A2')).toBe('Класс напряжения');
    expect(text(ws, 'B2')).toBe('ВЛ 110 кВ');
    expect(text(ws, 'A3')).toBe('Линия');
    expect(text(ws, 'B3')).toBe('Линия 1');
    expect(text(ws, 'A4')).toBe('Дата осмотра');
    expect(text(ws, 'B4')).toBe('2026-01-15');
    expect(text(ws, 'A5')).toBe('Инспектор');
    expect(text(ws, 'B5')).toBe('Иванов И.И.');

    expect(text(ws, 'A6')).toBe('Всего дефектов');
    expect(ws.getCell('B6').value).toBe(4);
    expect(text(ws, 'A7')).toBe('Активных');
    expect(ws.getCell('B7').value).toBe(3);
    expect(text(ws, 'A8')).toBe('Устранено');
    expect(ws.getCell('B8').value).toBe(1);
    expect(text(ws, 'A9')).toBe('Мест с дефектами');
    // Опора 1, опора 2 и один общий пролёт 5-6.
    expect(ws.getCell('B9').value).toBe(3);
  });

  it('считает места по пролёту, а при его отсутствии — по номеру опоры', () => {
    const ws = build([
      makeDefect({ id: 1, poleNumber: 7, spanRange: null }),
      makeDefect({ id: 2, poleNumber: 0, spanRange: '9-10' }),
      makeDefect({ id: 3, poleNumber: 0, spanRange: '9-10' }),
      makeDefect({ id: 4, poleNumber: 7, spanRange: '11-12' }),
    ]);

    expect(ws.getCell('B9').value).toBe(3);
  });
});
