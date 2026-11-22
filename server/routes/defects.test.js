// @vitest-environment node
'use strict';

process.env.FB_PASSWORD = process.env.FB_PASSWORD || 'test-password';

const defects = require('./defects');

const { normalizeSpan, normalizeCustomName, requiredForDefectPatch } = defects;

describe('normalizeSpan', () => {
  it('возвращает null для пустых значений', () => {
    expect(normalizeSpan(null)).toBeNull();
    expect(normalizeSpan(undefined)).toBeNull();
    expect(normalizeSpan('')).toBeNull();
    expect(normalizeSpan('   ')).toBeNull();
  });

  it('убирает пробелы и приводит разные тире к обычному дефису', () => {
    expect(normalizeSpan(' 5 ')).toBe('5');
    expect(normalizeSpan('5 - 10')).toBe('5-10');
    expect(normalizeSpan('5\u201310')).toBe('5-10');
    expect(normalizeSpan('5\u201410')).toBe('5-10');
    expect(normalizeSpan(' 5  -  10 ')).toBe('5-10');
  });

  it('приводит число к строке', () => {
    expect(normalizeSpan(7)).toBe('7');
  });
});

describe('normalizeCustomName', () => {
  it('возвращает null для пустых значений', () => {
    expect(normalizeCustomName(null)).toBeNull();
    expect(normalizeCustomName(undefined)).toBeNull();
    expect(normalizeCustomName('')).toBeNull();
    expect(normalizeCustomName(' \t\n ')).toBeNull();
  });

  it('обрезает края и схлопывает пробельные символы', () => {
    expect(normalizeCustomName('  Разрушен   изолятор ')).toBe('Разрушен изолятор');
    expect(normalizeCustomName('Строка\nс\tтабами')).toBe('Строка с табами');
  });

  it('ограничивает свободное описание 200 символами', () => {
    const long = 'а'.repeat(250);

    expect(normalizeCustomName(long)).toHaveLength(200);
    expect(normalizeCustomName(long)).toBe(long.slice(0, 200));
  });
});

describe('requiredForDefectPatch', () => {
  it('для пустого тела не требует прав', () => {
    expect(requiredForDefectPatch({})).toEqual([]);
  });

  it('устранение требует defects.fix', () => {
    expect(requiredForDefectPatch({ isFixed: true })).toEqual(['defects.fix']);
  });

  it('заключение мастера требует journal.conclusion', () => {
    expect(requiredForDefectPatch({ masterConclusion: 'Заменить' })).toEqual([
      'journal.conclusion',
    ]);
    expect(requiredForDefectPatch({ resolutionDeadline: '2026-02-01' })).toEqual([
      'journal.conclusion',
    ]);
    expect(requiredForDefectPatch({ masterName: 'Петров' })).toEqual(['journal.conclusion']);
    expect(requiredForDefectPatch({ fixWorkVolume: '2 шт.' })).toEqual(['journal.conclusion']);
  });

  it('дата и исполнитель устранения без isFixed относятся к журналу', () => {
    expect(requiredForDefectPatch({ dateFixed: '2026-02-01' })).toEqual(['journal.conclusion']);
    expect(requiredForDefectPatch({ inspectorFix: 'Петров' })).toEqual(['journal.conclusion']);
  });

  it('при наличии isFixed дата и исполнитель не требуют отдельных прав', () => {
    expect(
      requiredForDefectPatch({
        isFixed: true,
        dateFixed: '2026-02-01',
        inspectorFix: 'Петров',
      }),
    ).toEqual(['defects.fix']);
  });

  it('редактируемые поля требуют defects.edit', () => {
    for (const key of [
      'notes',
      'inspectorFind',
      'status',
      'customName',
      'poleNumber',
      'spanRange',
      'defectId',
      'phaseId',
      'insulatorCount',
      'dateFound',
    ]) {
      expect(requiredForDefectPatch({ [key]: 'x' }), key).toEqual(['defects.edit']);
    }
  });

  it('объединяет несколько требуемых прав без дублей', () => {
    expect(
      requiredForDefectPatch({
        isFixed: false,
        notes: 'примечание',
        masterConclusion: 'заключение',
      }),
    ).toEqual(['defects.fix', 'journal.conclusion', 'defects.edit']);
  });
});
