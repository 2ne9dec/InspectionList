import { makeDefect } from '@tests/factories';
import type { DefectType, Element, Phase } from '@/entities/InspectionLine';
import { enrichDefects } from './enrichDefects';

const defectTypes: DefectType[] = [
  { id: 1, name: 'Трещина', elementId: 10 },
  { id: 2, name: 'Скол', elementId: 10 },
];
const elements: Element[] = [{ id: 10, name: 'Опора' }];
const phases: Phase[] = [{ id: 1, name: 'A' }];

describe('enrichDefects', () => {
  it('добавляет названия элемента, дефекта и фазы', () => {
    const [row] = enrichDefects(
      [makeDefect({ defectId: 1, phaseId: 1 })],
      defectTypes,
      elements,
      phases,
    );

    expect(row.elementName).toBe('Опора');
    expect(row.defectName).toBe('Трещина');
    expect(row.phaseName).toBe('A');
    expect(row.id).toBe(1);
    expect(row.poleNumber).toBe(1);
  });

  it('оставляет phaseName = null, если фаза не задана', () => {
    const [row] = enrichDefects(
      [makeDefect({ defectId: 1, phaseId: null })],
      defectTypes,
      elements,
      phases,
    );

    expect(row.phaseName).toBeNull();
  });

  it('возвращает null для неизвестной фазы', () => {
    const [row] = enrichDefects(
      [makeDefect({ defectId: 1, phaseId: 99 })],
      defectTypes,
      elements,
      phases,
    );

    expect(row.phaseName).toBeNull();
  });

  it('свободное описание дефекта важнее названия вида и обрезается', () => {
    const [row] = enrichDefects(
      [makeDefect({ defectId: 2, customName: '  Трещина бетона  ' })],
      defectTypes,
      elements,
      phases,
    );

    expect(row.defectName).toBe('Трещина бетона');
  });

  it('игнорирует пустое свободное описание', () => {
    const [row] = enrichDefects(
      [makeDefect({ defectId: 2, customName: '   ' })],
      defectTypes,
      elements,
      phases,
    );

    expect(row.defectName).toBe('Скол');
  });

  it('подставляет прочерк для неизвестного вида дефекта и элемента', () => {
    const [row] = enrichDefects(
      [makeDefect({ defectId: 999 })],
      defectTypes,
      elements,
      phases,
    );

    expect(row.elementName).toBe('—');
    expect(row.defectName).toBe('—');
  });

  it('не мутирует исходные записи', () => {
    const record = makeDefect({ defectId: 1 });
    const { elementName: _elementName, defectName: _defectName, phaseName: _phaseName, ...plain } = record;

    const [row] = enrichDefects([plain], defectTypes, elements, phases);

    expect(plain).not.toHaveProperty('elementName');
    expect(row).not.toBe(plain);
  });

  it('сохраняет порядок и количество записей', () => {
    const records = [
      makeDefect({ id: 1, defectId: 1 }),
      makeDefect({ id: 2, defectId: 2 }),
      makeDefect({ id: 3, defectId: 1 }),
    ];

    expect(enrichDefects(records, defectTypes, elements, phases).map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it('возвращает пустой массив для пустого списка', () => {
    expect(enrichDefects([], defectTypes, elements, phases)).toEqual([]);
  });
});
