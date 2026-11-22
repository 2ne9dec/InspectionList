// @vitest-environment node
const lines = require('./lines.json');
const zhlobinLines = require('./2/lines.json');
const referenceLines = require('../../src/shared/config/reference/lines.json');

const byId = new Map(lines.map((line) => [line.id, line.name]));
const sapById = new Map(lines.map((line) => [line.id, line.sapCode]));

describe('seed lines', () => {
  it('не содержит двойных пробелов и строчного «кв»', () => {
    for (const line of lines) {
      expect(line.name, `id ${line.id}`).not.toMatch(/\s{2,}/);
      expect(line.name, `id ${line.id}`).not.toMatch(/\d\s*кв\b/);
    }
  });

  it('содержит исправленные названия линий Могилев/Жлобин', () => {
    expect(byId.get(247)).toBe('ВЛ 330 кВ Могилев - Жлобин 330');
    expect(byId.get(248)).toBe('ВЛ 330 кВ Мирадино - Жлобин Западная');
    expect(byId.get(249)).toBe('ВЛ 330 кВ Жлобин Западная - Сталь 330');
    expect(byId.get(250)).toBe('ВЛ 330 кВ Жлобин Западная - Прокат 330');
    expect(byId.get(251)).toBe('ВЛ 330 кВ Жлобин Западная - Металлургическая');
    expect(byId.get(252)).toBe('ВЛ 330 кВ Жлобин 330 - Металлургическая');
  });

  it('содержит исправленные названия линий Мозырь/Петриков', () => {
    expect(byId.get(340)).toBe('ВЛ 330 кВ ПС Мозырь 330 - ЧАЭС');
    expect(byId.get(341)).toBe('ВЛ 330 кВ Мозырь 330 - Петриков 330');
    expect(byId.get(342)).toBe('ВЛ 330 кВ Микашевичи 330 - Петриков 330');
  });

  it('у всех линий Жлобинских ЭС заполнен SAP-код', () => {
    const zhlobin = lines.filter((line) => Number(line.filialId) === 2);
    expect(zhlobin).toHaveLength(84);
    for (const line of zhlobin) {
      expect(line.sapCode, `id ${line.id}`).toMatch(/^VL\d{3}-\d{6}(-5\d{2})?$/);
    }
  });

  it('у всех линий Жлобинских ЭС заполнены границы и количество опор', () => {
    const zhlobin = lines.filter((line) => Number(line.filialId) === 2);
    for (const line of zhlobin) {
      expect(line.poleStart, `id ${line.id} poleStart`).toEqual(expect.any(Number));
      expect(line.poleEnd, `id ${line.id} poleEnd`).toEqual(expect.any(Number));
      expect(line.poleCount, `id ${line.id} poleCount`).toEqual(expect.any(Number));
      expect(line.poleEnd).toBeGreaterThanOrEqual(line.poleStart);
      expect(line.poleCount).toBeGreaterThan(0);
    }
  });

  it('границы опор Жлобинских ЭС совпадают с Excel «Координаты линий ЖЭС»', () => {
    const expected = {
      188: [1, 73, 73],   // Красный Берег - Щедрин
      187: [1, 71, 71],   // Красный Берег - Малевичи
      192: [1, 18, 18],   // Задрутье - Рогачёв
      190: [1, 93, 93],   // Задрутье - Дворец
      204: [1, 79, 79],   // Чечерск - Нисимковичи
      207: [1, 53, 53],   // Щедрин - Паричи
      209: [1, 85, 85],   // Жлобин 110 - Буда Кошелёво
      214: [1, 12, 12],   // Жлобин Западная - Прокат
      217: [1, 18, 18],   // Жлобин Западная - Сталь
      218: [1, 160, 160], // Жлобин Западная - Жлобин 330
      219: [1, 36, 36],   // Жлобин Западная - Северная №1
      221: [1, 36, 36],   // Жлобин Западная - Северная №2
      225: [1, 162, 162], // Жлобин 330 - Металлургическая №2
      228: [1, 127, 127], // Жлобин 330 - Меркуловичи
      230: [1, 51, 51],   // Диапроектор - Задрутье
      232: [1, 102, 102], // Чечерск - Рогинь
      238: [1, 12, 12],   // Металлургическая - Прокат
      240: [1, 18, 18],   // Металлургическая - Корд
      242: [1, 18, 18],   // Жлобин Западная - Тяговая №2
      244: [1, 62, 61],   // Жлобин Западная - Лукское (есть пропуск опоры)
      245: [1, 115, 115], // Жлобин 330 - Жлобин 110
      513: [1, 3, 3],     // отп. № 2 к ПС Четверни
      550: [1, 43, 43],   // отп. № 3 к ПС Стрешин
      551: [1, 40, 40],   // отп. № 1 к ПС Станьковская
      553: [1, 39, 39],   // отп. № 2 к ПС Крутое
    };
    const poleById = new Map(lines.map((line) => [
      line.id,
      [line.poleStart, line.poleEnd, line.poleCount],
    ]));
    for (const [id, expectedPoles] of Object.entries(expected)) {
      expect(poleById.get(Number(id)), `id ${id}`).toEqual(expectedPoles);
    }
  });

  it('филиальный seed Жлобинских ЭС совпадает с основным по IDs, опорам и SAP', () => {
    const main = lines
      .filter((line) => Number(line.filialId) === 2)
      .sort((a, b) => a.id - b.id)
      .map((line) => [line.id, line.poleStart, line.poleEnd, line.poleCount, line.sapCode]);
    const filial = [...zhlobinLines]
      .sort((a, b) => a.id - b.id)
      .map((line) => [line.id, line.poleStart, line.poleEnd, line.poleCount, line.sapCode]);
    expect(filial).toEqual(main);
  });

  it('не содержит дублирующих участков 455 и 456, которых нет в LineVision', () => {
    expect(byId.has(455)).toBe(false);
    expect(byId.has(456)).toBe(false);
  });

  it('содержит SAP-коды отпаек Жлобинских ЭС из LineVision', () => {
    const expected = {
      454: 'VL035-000102-501',
      458: 'VL035-000109-501',
      512: 'VL110-000085-501',
      513: 'VL110-000085-503',
      545: 'VL110-000133-502',
      546: 'VL110-000135-501',
      547: 'VL110-000143-501',
      548: 'VL110-000146-501',
      549: 'VL110-000146-502',
      550: 'VL110-000146-503',
      551: 'VL110-000147-501',
      552: 'VL110-000149-501',
      554: 'VL110-000153-501',
      587: 'VL110-000259-502',
    };
    for (const [id, sapCode] of Object.entries(expected)) {
      expect(sapById.get(Number(id)), `id ${id}`).toBe(sapCode);
    }
  });
});
