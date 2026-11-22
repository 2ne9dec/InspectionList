import type { DefectType, Element, Phase } from '@/entities/InspectionLine';
import { formatDefectLocation } from './formatDefectLocation';

const defectType: DefectType = { id: 1, name: 'Трещина', elementId: 10 };
const element: Element = { id: 10, name: 'Опора' };
const phase: Phase = { id: 1, name: 'A' };

describe('formatDefectLocation', () => {
  it('форматирует пролёт с фазой и элементом', () => {
    expect(formatDefectLocation(
      { poleNumber: 0, spanRange: '47-48', customName: null },
      defectType,
      element,
      phase,
    )).toBe('Пр. 47-48 / A / Опора: Трещина');
  });

  it('форматирует опору, если пролёт не задан', () => {
    expect(formatDefectLocation(
      { poleNumber: 47, spanRange: null, customName: null },
      defectType,
      element,
      undefined,
    )).toBe('Оп. 47 / Опора: Трещина');
  });

  it('пролёт имеет приоритет над номером опоры', () => {
    expect(formatDefectLocation(
      { poleNumber: 47, spanRange: '47-48', customName: null },
      undefined,
      undefined,
      undefined,
    )).toBe('Пр. 47-48');
  });

  it('свободное описание дефекта важнее названия вида', () => {
    expect(formatDefectLocation(
      { poleNumber: 5, spanRange: null, customName: '  Трещина бетона  ' },
      defectType,
      element,
      undefined,
    )).toBe('Оп. 5 / Опора: Трещина бетона');
  });

  it('игнорирует пустое свободное описание', () => {
    expect(formatDefectLocation(
      { poleNumber: 5, spanRange: null, customName: '   ' },
      defectType,
      element,
      undefined,
    )).toBe('Оп. 5 / Опора: Трещина');
  });

  it('выводит только название дефекта, если элемент неизвестен', () => {
    expect(formatDefectLocation(
      { poleNumber: 5, spanRange: null, customName: null },
      defectType,
      undefined,
      phase,
    )).toBe('Оп. 5 / A / Трещина');
  });

  it('пропускает неизвестные части локации', () => {
    expect(formatDefectLocation(
      { poleNumber: 5, spanRange: null, customName: null },
      undefined,
      element,
      undefined,
    )).toBe('Оп. 5');
  });

  it('возвращает пустую строку, если данных нет', () => {
    expect(formatDefectLocation(
      { poleNumber: 0, spanRange: null, customName: null },
      undefined,
      undefined,
      undefined,
    )).toBe('');
  });
});
