import ExcelJS from 'exceljs';
import type { Worksheet } from 'exceljs';
import { describe, expect, it } from 'vitest';
import { makeDefect } from '@tests/factories';
import { buildStatsSheet } from './buildStatsSheet';
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
  defectTypes: [
    { id: 1, name: 'Разрушен изолятор', elementId: 10 },
    { id: 2, name: 'Обрыв провода', elementId: 20 },
    { id: 136, name: 'Свой дефект', elementId: 31, custom: true },
  ],
  elements: [
    { id: 10, name: 'Изолятор' },
    { id: 20, name: 'Провод' },
    { id: 31, name: 'Линейная арматура' },
  ],
};

const text = (ws: Worksheet, address: string): string => {
  const value = ws.getCell(address).value;
  return value == null ? '' : String(value);
};

const build = (defects: ExportParams['defects']) => {
  const wb = new ExcelJS.Workbook();
  buildStatsSheet(wb, { ...params, defects });
  const ws = wb.getWorksheet('Статистика');
  expect(ws).toBeDefined();
  return ws!;
};

describe('buildStatsSheet', () => {
  it('создаёт шапку статистики', () => {
    const ws = build([]);

    expect(text(ws, 'A1')).toBe('Элемент');
    expect(text(ws, 'B1')).toBe('Вид дефекта');
    expect(text(ws, 'C1')).toBe('Активных');
    expect(text(ws, 'D1')).toBe('Устранено');

    expect(text(ws, 'A2')).toBe('ИТОГО');
    expect(ws.getCell('C2').value).toBe(0);
    expect(ws.getCell('D2').value).toBe(0);
  });

  it('агрегирует активные и устранённые дефекты по элементу и виду', () => {
    const ws = build([
      makeDefect({ id: 1, defectId: 1, isFixed: false }),
      makeDefect({ id: 2, defectId: 1, isFixed: false }),
      makeDefect({ id: 3, defectId: 1, isFixed: true }),
      makeDefect({ id: 4, defectId: 2, isFixed: false }),
    ]);

    expect(text(ws, 'A2')).toBe('Изолятор');
    expect(text(ws, 'B2')).toBe('Разрушен изолятор');
    expect(ws.getCell('C2').value).toBe(2);
    expect(ws.getCell('D2').value).toBe(1);

    expect(text(ws, 'A3')).toBe('Провод');
    expect(text(ws, 'B3')).toBe('Обрыв провода');
    expect(ws.getCell('C3').value).toBe(1);
    expect(ws.getCell('D3').value).toBe(0);

    expect(text(ws, 'A4')).toBe('ИТОГО');
    expect(ws.getCell('C4').value).toBe(3);
    expect(ws.getCell('D4').value).toBe(1);
  });

  it('разделяет свободные описания и объединяет одинаковые после trim', () => {
    const ws = build([
      makeDefect({ id: 1, defectId: 136, customName: 'Свой текст', isFixed: false }),
      makeDefect({ id: 2, defectId: 136, customName: '  Свой текст  ', isFixed: false }),
      makeDefect({ id: 3, defectId: 136, customName: 'Другой текст', isFixed: true }),
      makeDefect({ id: 4, defectId: 136, customName: null, isFixed: true }),
    ]);

    expect(text(ws, 'A2')).toBe('Линейная арматура');
    expect(text(ws, 'B2')).toBe('Свой текст');
    expect(ws.getCell('C2').value).toBe(2);
    expect(ws.getCell('D2').value).toBe(0);

    expect(text(ws, 'B3')).toBe('Другой текст');
    expect(ws.getCell('C3').value).toBe(0);
    expect(ws.getCell('D3').value).toBe(1);

    // Без customName ключ строится по defectId, поэтому строка та же («Свой дефект»).
    expect(text(ws, 'B4')).toBe('Свой дефект');
    expect(ws.getCell('C4').value).toBe(0);
    expect(ws.getCell('D4').value).toBe(1);

    expect(text(ws, 'A5')).toBe('ИТОГО');
    expect(ws.getCell('C5').value).toBe(2);
    expect(ws.getCell('D5').value).toBe(2);
  });

  it('сортирует строки по убыванию активных дефектов', () => {
    const ws = build([
      makeDefect({ id: 1, defectId: 2, isFixed: false }),
      makeDefect({ id: 2, defectId: 1, isFixed: false }),
      makeDefect({ id: 3, defectId: 1, isFixed: false }),
      makeDefect({ id: 4, defectId: 1, isFixed: false }),
    ]);

    expect(text(ws, 'B2')).toBe('Разрушен изолятор');
    expect(ws.getCell('C2').value).toBe(3);
    expect(text(ws, 'B3')).toBe('Обрыв провода');
    expect(ws.getCell('C3').value).toBe(1);
  });

  it('показывает «—» для неизвестного вида дефекта', () => {
    const ws = build([makeDefect({ id: 1, defectId: 999, isFixed: false })]);

    expect(text(ws, 'A2')).toBe('—');
    expect(text(ws, 'B2')).toBe('—');
    expect(ws.getCell('C2').value).toBe(1);
  });
});
