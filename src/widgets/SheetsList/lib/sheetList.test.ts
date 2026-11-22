import type { DefectCount } from '@/entities/DefectRecord';
import type { Filial, Line, Voltage } from '@/entities/InspectionLine';
import { makeSheet, makeSheetFull } from '@tests/factories';
import {
  countStatuses,
  enrichPendingSheets,
  enrichSheets,
  filterPendingSheets,
  filterSheets,
  mapDefectCounts,
  matchesSheetSearch,
  sortSheets,
} from './sheetList';

const maps = {
  filialById: new Map<number, Filial>([[1, { id: 1, name: 'Гомель' }]]),
  voltageById: new Map<number, Voltage>([[10, { id: 10, name: 'ВЛ 110 кВ', filialId: 1 }]]),
  lineById: new Map<number, Line>([[
    100,
    { id: 100, name: 'Линия 1', voltageId: 10, filialId: 1, poleStart: 1, poleEnd: 20, poleCount: 20 },
  ]]),
};

describe('sheetList', () => {
  it('преобразует счётчики дефектов в Map', () => {
    const counts: DefectCount[] = [
      { sheetId: 1, active: 3, fixed: 2 },
      { sheetId: 2, active: 0, fixed: 1 },
    ];
    expect(mapDefectCounts(counts).get(1)).toEqual({ active: 3, fixed: 2 });
  });

  it('обогащает серверный листок названиями и границами', () => {
    const [sheet] = enrichSheets(
      [makeSheet({ id: 1, filialId: 1, voltageId: 10, lineId: 100 })],
      maps,
      new Map([[1, { active: 2, fixed: 1 }]]),
    );

    expect(sheet).toMatchObject({
      filialName: 'Гомель',
      voltageName: 'ВЛ 110 кВ',
      lineName: 'Линия 1',
      poleStart: 1,
      poleEnd: 20,
      poleCount: 20,
      activeCount: 2,
      fixedCount: 1,
    });
  });

  it('обогащает офлайн-листок', () => {
    const [sheet] = enrichPendingSheets([
      {
        localId: -1,
        filialId: 1,
        voltageId: 10,
        lineId: 100,
        createdDate: '2026-01-01',
        createdBy: 'Иванов',
        createdAt: '2026-01-01T10:00:00.000Z',
      },
    ], maps);

    expect(sheet).toMatchObject({
      id: -1,
      status: 'pending',
      lineName: 'Линия 1',
      poleCount: 20,
      activeCount: 0,
    });
  });

  it('ищет по линии, филиалу, напряжению и автору', () => {
    const sheet = makeSheetFull();
    expect(matchesSheetSearch(sheet, '')).toBe(true);
    expect(matchesSheetSearch(sheet, 'линия')).toBe(true);
    expect(matchesSheetSearch(sheet, 'гомель')).toBe(true);
    expect(matchesSheetSearch(sheet, '110')).toBe(true);
    expect(matchesSheetSearch(sheet, 'иванов')).toBe(true);
    expect(matchesSheetSearch(sheet, 'мозырь')).toBe(false);
  });

  it('фильтрует по филиалу, поиску и статусу', () => {
    const rows = [
      makeSheetFull({ id: 1, filialId: 1, status: 'active' }),
      makeSheetFull({ id: 2, filialId: 2, status: 'archived' }),
    ];

    expect(filterSheets(rows, 1, '', 'all')).toHaveLength(1);
    expect(filterSheets(rows, null, '', 'archived')).toEqual([rows[1]]);
    expect(filterSheets(rows, null, 'линия 1', 'all')).toHaveLength(2);
  });

  it('фильтрует офлайн-листки по филиалу и поиску', () => {
    const pending = [
      makeSheetFull({ id: -1, filialId: 1, status: 'pending', filialName: 'Гомель', lineName: 'Линия 1' }),
      makeSheetFull({ id: -2, filialId: 2, status: 'pending', filialName: 'Жлобин', lineName: 'Линия 2' }),
    ];

    expect(filterPendingSheets(pending, 1, '')).toEqual([pending[0]]);
    expect(filterPendingSheets(pending, null, 'гомель')).toHaveLength(1);
  });

  it('сортирует по напряжению, дате и автору', () => {
    const rows = [
      makeSheetFull({ id: 1, voltageName: 'ВЛ 330 кВ', createdDate: '2026-01-02', createdBy: 'Петров' }),
      makeSheetFull({ id: 2, voltageName: 'ВЛ 35 кВ', createdDate: '2026-01-01', createdBy: 'Иванов' }),
    ];

    expect(sortSheets(rows, 'voltage', 'asc').map((s) => s.id)).toEqual([2, 1]);
    expect(sortSheets(rows, 'date', 'asc').map((s) => s.id)).toEqual([2, 1]);
    expect(sortSheets(rows, 'inspector', 'asc').map((s) => s.id)).toEqual([2, 1]);
    expect(sortSheets(rows, 'voltage', 'desc').map((s) => s.id)).toEqual([1, 2]);
  });

  it('считает статусы с учётом офлайн-листков', () => {
    const enriched = [
      makeSheetFull({ id: 1, status: 'active' }),
      makeSheetFull({ id: 2, status: 'archived' }),
    ];
    const pending = [makeSheetFull({ id: -1, status: 'pending' })];

    expect(countStatuses(enriched, pending, null, '')).toEqual({
      all: 3,
      active: 1,
      archived: 1,
    });
  });
});
