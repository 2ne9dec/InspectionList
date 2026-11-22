import ExcelJS from 'exceljs';
import type { Worksheet } from 'exceljs';
import { describe, expect, it } from 'vitest';
import { makeDefect } from '@tests/factories';
import type { DefectRecord } from '@/entities/DefectRecord';
import { buildJournalSheet } from './buildJournalSheet';
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
    { id: 2, name: 'Свой дефект', elementId: 31, custom: true },
  ],
  elements: [
    { id: 10, name: 'Изолятор' },
    { id: 31, name: 'Линейная арматура' },
  ],
  phases: [
    { id: 5, name: 'A' },
    { id: 6, name: 'B' },
  ],
};

const text = (ws: Worksheet, address: string): string => {
  const value = ws.getCell(address).value;
  return value == null ? '' : String(value);
};

const build = (sorted: DefectRecord[]) => {
  const wb = new ExcelJS.Workbook();
  buildJournalSheet(wb, params, sorted);
  const ws = wb.getWorksheet('Журнал неисправностей');
  expect(ws).toBeDefined();
  return ws!;
};

describe('buildJournalSheet', () => {
  it('создаёт лист журнала с заголовком, шапкой и колонкой SAP-кода', () => {
    const ws = build([]);

    expect(text(ws, 'A1')).toBe('ЖУРНАЛ НЕИСПРАВНОСТЕЙ');
    expect(text(ws, 'A2')).toContain('Гомельские ЭС');
    expect(text(ws, 'A2')).toContain('Линия 1');
    expect(text(ws, 'A2')).toContain('Дата осмотра: 15.01.2026');

    expect(text(ws, 'A3')).toBe('Дата обнаружения');
    expect(text(ws, 'B3')).toBe('Ф.И.О. обнаружившего');
    expect(text(ws, 'C3')).toContain('Место обнаружения неисправности');
    expect(text(ws, 'D3')).toBe('Заключение мастера по устранению');
    expect(text(ws, 'F3')).toBe('Информация об устранении неисправностей');
    expect(text(ws, 'H3')).toBe('SAP-код опоры');
    expect(text(ws, 'D4')).toBe('мероприятия по устранению');
    expect(text(ws, 'E4')).toBe('срок устранения, Ф.И.О.');
    expect(text(ws, 'F4')).toBe('дата устранения, объём работ');
    expect(text(ws, 'G4')).toBe('Ф.И.О. производителя работ');

    expect(ws.autoFilter).toMatchObject({ from: { row: 4, column: 1 }, to: { row: 4, column: 8 } });
    expect(ws.views[0]).toMatchObject({ state: 'frozen', ySplit: 4 });
  });

  it('заполняет строки дефектов: место, фаза, элемент, дефект и SAP-код', () => {
    const ws = build([
      makeDefect({
        id: 1,
        poleNumber: 5,
        defectId: 1,
        phaseId: 5,
        dateFound: '2026-01-02',
        inspectorFind: 'Иванов И.И.',
        isFixed: true,
        dateFixed: '2026-01-04',
        inspectorFix: 'Петров П.П.',
        insulatorCount: 3,
        sapCode: 'VL110-000001',
      }),
      makeDefect({
        id: 2,
        poleNumber: 0,
        spanRange: '7-8',
        defectId: 2,
        customName: 'Своё описание',
        phaseId: null,
        dateFound: '2026-01-03',
        inspectorFind: 'Сидоров С.С.',
        isFixed: false,
      }),
      makeDefect({
        id: 3,
        poleNumber: 9,
        defectId: 1,
        phaseId: null,
        dateFound: '2026-01-05',
        inspectorFind: 'Орлов О.О.',
        isFixed: false,
      }),
    ]);

    expect(text(ws, 'A5')).toBe('02.01.2026');
    expect(text(ws, 'B5')).toBe('Иванов И.И.');
    expect(text(ws, 'C5')).toBe('Оп. 5 / A\nИзолятор: Разрушен изолятор (3 шт.)');
    expect(text(ws, 'D5')).toBe('');
    expect(text(ws, 'E5')).toBe('');
    expect(text(ws, 'F5')).toBe('04.01.2026');
    expect(text(ws, 'G5')).toBe('Петров П.П.');
    expect(text(ws, 'H5')).toBe('VL110-000001');

    expect(text(ws, 'C6')).toBe('Пролёт 7-8\nЛинейная арматура: Своё описание');
    expect(text(ws, 'F6')).toBe('');
    expect(text(ws, 'G6')).toBe('');
    expect(text(ws, 'H6')).toBe('');

    expect(text(ws, 'C7')).toBe('Оп. 9\nИзолятор: Разрушен изолятор');
    expect(text(ws, 'F7')).toBe('');
  });

  it('подставляет «—», если вид дефекта не найден, и сохраняет customName приоритетным', () => {
    const ws = build([
      makeDefect({ id: 1, poleNumber: 1, defectId: 999, phaseId: null }),
      makeDefect({
        id: 2,
        poleNumber: 2,
        defectId: 1,
        phaseId: null,
        customName: '  Уточнённое описание  ',
      }),
    ]);

    expect(text(ws, 'C5')).toBe('Оп. 1\n: —');
    expect(text(ws, 'C6')).toBe('Оп. 2\nИзолятор: Уточнённое описание');
  });

  it('добавляет итоговую строку с количеством активных и устранённых', () => {
    const ws = build([
      makeDefect({ id: 1, isFixed: true }),
      makeDefect({ id: 2, isFixed: false }),
      makeDefect({ id: 3, isFixed: false }),
    ]);

    expect(text(ws, 'A8')).toBe('Итого: 3   |   Активных: 2   |   Устранено: 1');
    expect(ws.getCell('A8').font?.bold).toBe(true);
  });
});
