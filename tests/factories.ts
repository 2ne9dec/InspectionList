import type { DefectRecordFull } from '@/entities/DefectRecord';
import type { InspectionSheet, InspectionSheetFull } from '@/entities/InspectionSheet';
import type { JournalRow } from '@/pages/JournalPage/lib/journalRows';

/** Минимальная запись дефекта для тестов. */
export function makeDefect(overrides: Partial<DefectRecordFull> = {}): DefectRecordFull {
  return {
    id: 1,
    sheetId: 1,
    poleNumber: 1,
    defectId: 1,
    phaseId: null,
    dateFound: '2026-01-01',
    inspectorFind: 'Иванов И.И.',
    dateFixed: null,
    inspectorFix: null,
    isFixed: false,
    notes: null,
    insulatorCount: null,
    spanRange: null,
    garlandNumber: null,
    elementName: 'Изолятор',
    defectName: 'Разрушен',
    phaseName: null,
    ...overrides,
  };
}

/** Минимальный листок осмотра для тестов. */
export function makeSheet(overrides: Partial<InspectionSheet> = {}): InspectionSheet {
  return {
    id: 1,
    filialId: 1,
    voltageId: 1,
    lineId: 1,
    createdDate: '2026-01-01',
    createdBy: 'Иванов И.И.',
    status: 'active',
    ...overrides,
  };
}

/** Минимальный обогащённый листок для тестов. */
export function makeSheetFull(overrides: Partial<InspectionSheetFull> = {}): InspectionSheetFull {
  return {
    ...makeSheet(),
    filialName: 'Гомель',
    voltageName: 'ВЛ 110 кВ',
    lineName: 'Линия 1',
    poleStart: 1,
    poleEnd: 10,
    poleCount: 10,
    activeCount: 0,
    fixedCount: 0,
    ...overrides,
  };
}

/** Минимальная строка журнала для тестов. */
export function makeJournalRow(overrides: Partial<JournalRow> = {}): JournalRow {
  return {
    d: makeDefect(),
    line: undefined,
    voltage: undefined,
    filialName: '',
    location: '',
    ...overrides,
  };
}
