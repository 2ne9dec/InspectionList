// @vitest-environment node
const { splitInspectors, collectInspectors } = require('./sheetInspectors');

describe('sheet inspectors', () => {
  it('разбирает несколько ФИО через запятую', () => {
    expect(splitInspectors('Иванов И.И., Петров П.П.')).toEqual([
      'Иванов И.И.',
      'Петров П.П.',
    ]);
    expect(splitInspectors('')).toEqual([]);
    expect(splitInspectors(null)).toEqual([]);
  });

  it('собирает уникальные ФИО из исходных листков', () => {
    const sheets = [
      { created_by: 'Иванов И.И., Петров П.П.' },
      { created_by: 'Петров П.П.' },
      { inspectors: 'Сидоров С.С.' },
    ];
    expect(collectInspectors(sheets)).toEqual([
      'Иванов И.И.',
      'Петров П.П.',
      'Сидоров С.С.',
    ]);
  });

  it('нормализует пробелы и одинаковые ФИО не дублирует', () => {
    expect(collectInspectors([
      { created_by: 'Вежновец П. С., Глушанков В.В.' },
      { created_by: 'Вежновец П.С., Глушанков В. В.' },
    ])).toEqual(['Вежновец П.С.', 'Глушанков В.В.']);
  });

  it('сохраняет порядок и не добавляет пустые значения', () => {
    expect(collectInspectors([
      { created_by: null },
      { created_by: '  Иванов И.И.  ' },
      { created_by: '' },
    ])).toEqual(['Иванов И.И.']);
  });
});
