import type { DefectType, Element, Line, Phase, Voltage } from '@/entities/InspectionLine';
import { makeDefect, makeSheet } from '@tests/factories';
import { buildJournalRows } from './journalRows';
import type { JournalRow } from './journalRows';

const sheets = [
  makeSheet({ id: 1, filialId: 1, voltageId: 10, lineId: 100 }),
  makeSheet({ id: 2, filialId: 2, voltageId: 20, lineId: 200 }),
];

const maps = {
  sheetMap: new Map(sheets.map((s) => [s.id, s])),
  defectTypeMap: new Map<number, DefectType>([
    [1, { id: 1, name: 'Разрушен', elementId: 1 }],
    [2, { id: 2, name: 'Загрязнён', elementId: 2 }],
  ]),
  elementMap: new Map<number, Element>([
    [1, { id: 1, name: 'Изолятор' }],
    [2, { id: 2, name: 'Траверса' }],
  ]),
  phaseMap: new Map<number, Phase>([[1, { id: 1, name: 'Фаза A' }]]),
  lineMap: new Map<number, Line>([
    [100, { id: 100, name: 'Линия 1', voltageId: 10, filialId: 1 }],
    [200, { id: 200, name: 'Линия 2', voltageId: 20, filialId: 2 }],
  ]),
  voltageMap: new Map<number, Voltage>([
    [10, { id: 10, name: 'ВЛ 110 кВ', filialId: 1 }],
    [20, { id: 20, name: 'ВЛ 330 кВ', filialId: 2 }],
  ]),
  filialNameMap: new Map<number, string>([[1, 'Гомель'], [2, 'Жлобин']]),
};

const defects = [
  makeDefect({
    id: 1, sheetId: 1, poleNumber: 5, defectId: 1, phaseId: 1,
    dateFound: '2026-01-02', inspectorFind: 'Иванов И.И.',
  }),
  makeDefect({
    id: 2, sheetId: 1, poleNumber: 10, defectId: 2, isFixed: true,
    dateFound: '2026-01-01', inspectorFind: 'Петров П.П.',
  }),
  makeDefect({
    id: 3, sheetId: 2, poleNumber: 0, spanRange: '10-15', defectId: 1,
    dateFound: '2026-01-03', inspectorFind: 'иванов и.и.',
  }),
  makeDefect({ id: 4, sheetId: 999 }),
];

const baseFilters = {
  statusFilter: 'all' as const,
  dateFrom: '',
  dateTo: '',
  voltageFilter: '',
  lineFilter: '',
  selectedDefectTypeIds: new Set<number>(),
  inspectorFilter: '',
  poleFilter: '',
};

const ids = (rows: JournalRow[]) => rows.map((r) => r.d.id);

describe('buildJournalRows', () => {
  it('обогащает строки и сортирует по дате убывания', () => {
    const rows = buildJournalRows(defects, maps, baseFilters);

    expect(ids(rows)).toEqual([3, 1, 2]);
    expect(rows[1]).toMatchObject({
      line: maps.lineMap.get(100),
      voltage: maps.voltageMap.get(10),
      filialName: 'Гомель',
    });
    expect(rows[1].location).toContain('Изолятор: Разрушен');
    expect(rows[0].location).toContain('Пр. 10-15');
  });

  it('фильтрует по статусу', () => {
    expect(ids(buildJournalRows(defects, maps, { ...baseFilters, statusFilter: 'active' }))).toEqual([3, 1]);
    expect(ids(buildJournalRows(defects, maps, { ...baseFilters, statusFilter: 'fixed' }))).toEqual([2]);
  });

  it('фильтрует по датам', () => {
    const rows = buildJournalRows(defects, maps, { ...baseFilters, dateFrom: '2026-01-02' });
    expect(ids(rows)).toEqual([3, 1]);
  });

  it('фильтрует по напряжению и линии', () => {
    expect(ids(buildJournalRows(defects, maps, { ...baseFilters, voltageFilter: '10' }))).toEqual([1, 2]);
    expect(ids(buildJournalRows(defects, maps, { ...baseFilters, lineFilter: '200' }))).toEqual([3]);
  });

  it('фильтрует по виду дефекта', () => {
    const rows = buildJournalRows(defects, maps, {
      ...baseFilters,
      selectedDefectTypeIds: new Set([1]),
    });
    expect(ids(rows)).toEqual([3, 1]);
  });

  it('фильтрует по ФИО без учёта регистра', () => {
    const rows = buildJournalRows(defects, maps, { ...baseFilters, inspectorFilter: 'ИВАНОВ' });
    expect(ids(rows)).toEqual([3, 1]);
  });

  it('фильтрует по опоре и пролёту', () => {
    expect(ids(buildJournalRows(defects, maps, { ...baseFilters, poleFilter: '5' }))).toEqual([1]);
    expect(ids(buildJournalRows(defects, maps, { ...baseFilters, poleFilter: '12' }))).toEqual([3]);
    expect(ids(buildJournalRows(defects, maps, { ...baseFilters, poleFilter: '5-12' }))).toEqual([3, 1, 2]);
  });
});
