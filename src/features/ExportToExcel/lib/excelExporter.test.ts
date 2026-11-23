import ExcelJS from 'exceljs';
import type { Worksheet } from 'exceljs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeDefect } from '@tests/factories';
import type { ExportParams } from './excel/types';

vi.mock('./excel/downloadWorkbook', () => ({
  downloadWorkbook: vi.fn(async () => {}),
}));

import { exportToExcel } from './excelExporter';
import { downloadWorkbook } from './excel/downloadWorkbook';

const downloadMock = vi.mocked(downloadWorkbook);

const makeParams = (defects: ExportParams['defects']): ExportParams => ({
  sheet: {
    filialName: 'Гомельские ЭС',
    voltageName: 'ВЛ 110 кВ',
    lineName: 'Линия 1',
    createdDate: '2026-01-15',
    createdBy: 'Иванов И.И.',
  },
  defects,
  defectTypes: [{ id: 1, name: 'Разрушен изолятор', elementId: 10 }],
  elements: [{ id: 10, name: 'Изолятор' }],
});

const cellText = (ws: Worksheet, address: string): string => {
  const value = ws.getCell(address).value;
  return value == null ? '' : String(value);
};

describe('exportToExcel', () => {
  beforeEach(() => {
    downloadMock.mockClear();
  });

  it('собирает три листа, сортирует дефекты по опоре и отдаёт файл на скачивание', async () => {
    await exportToExcel(
      makeParams([
        makeDefect({ id: 1, poleNumber: 30, inspectorFind: 'Тридцать' }),
        makeDefect({ id: 2, poleNumber: 10, inspectorFind: 'Десять' }),
        makeDefect({ id: 3, poleNumber: undefined as unknown as number, inspectorFind: 'Без номера' }),
      ]),
    );

    expect(downloadMock).toHaveBeenCalledTimes(1);
    const [buffer, fileName] = downloadMock.mock.calls[0];

    expect(fileName).toBe('Журнал_Линия 1_2026-01-15.xlsx');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as ArrayBuffer);

    expect(wb.worksheets.map((ws) => ws.name)).toEqual([
      'Журнал неисправностей',
      'Статистика',
      'Сводка',
    ]);

    const journal = wb.getWorksheet('Журнал неисправностей')!;
    expect(cellText(journal, 'C5')).toContain('Оп. 10');
    expect(cellText(journal, 'C6')).toContain('Оп. 30');
    expect(cellText(journal, 'C7')).toContain('Оп. undefined');
    expect(cellText(journal, 'B5')).toBe('Десять');
    expect(cellText(journal, 'B6')).toBe('Тридцать');
    expect(cellText(journal, 'B7')).toBe('Без номера');
  });

  it('заменяет запрещённые в имени файла символы подчёркиваниями', async () => {
    const params = makeParams([]);
    params.sheet.lineName = 'A<>:"/\\|?*B';

    await exportToExcel(params);

    const expectedLine = 'A' + '_'.repeat(9) + 'B';
    expect(downloadMock.mock.calls[0][1]).toBe(`Журнал_${expectedLine}_2026-01-15.xlsx`);
  });

  it('обрезает длинное имя линии до 50 символов', async () => {
    const params = makeParams([]);
    params.sheet.lineName = 'X'.repeat(80);

    await exportToExcel(params);

    expect(downloadMock.mock.calls[0][1]).toBe(
      `Журнал_${'X'.repeat(50)}_2026-01-15.xlsx`,
    );
  });
});
