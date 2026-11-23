import { makeDefect } from '@tests/factories';
import { groupDefectRows } from './groupDefects';

describe('groupDefectRows', () => {
  it('объединяет одинаковые элемент/дефект/фазу', () => {
    const groups = groupDefectRows([
      makeDefect({ id: 1 }),
      makeDefect({ id: 2 }),
      makeDefect({ id: 3, defectName: 'Загрязнён' }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].ids).toEqual([1, 2]);
    expect(groups[0].first.id).toBe(1);
    expect(groups[1].ids).toEqual([3]);
  });

  it('разделяет дефекты по фазе', () => {
    const groups = groupDefectRows([
      makeDefect({ id: 1, phaseId: 1, phaseName: 'Фаза A' }),
      makeDefect({ id: 2, phaseId: 2, phaseName: 'Фаза B' }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].phases).toBe('Фаза A');
    expect(groups[0].phaseItems).toEqual([{ id: 1, name: 'Фаза A' }]);
  });

  it('сортирует группы по первому id типа дефекта, затем по фазе', () => {
    const groups = groupDefectRows([
      makeDefect({ id: 5, elementName: 'Б', phaseId: 2, phaseName: 'B' }),
      makeDefect({ id: 1, elementName: 'А', phaseId: 2, phaseName: 'B' }),
      makeDefect({ id: 2, elementName: 'А', phaseId: 1, phaseName: 'A' }),
    ]);

    expect(groups.map((g) => g.first.elementName)).toEqual(['А', 'А', 'Б']);
    expect(groups[0].first.phaseName).toBe('A');
    expect(groups[1].first.phaseName).toBe('B');
  });
});
