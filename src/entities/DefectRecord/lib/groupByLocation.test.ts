import { makeDefect } from '@tests/factories';
import { groupByLocation } from './groupByLocation';

describe('groupByLocation', () => {
  it('группирует дефекты по опоре', () => {
    const groups = groupByLocation([
      makeDefect({ id: 1, poleNumber: 2 }),
      makeDefect({ id: 2, poleNumber: 2 }),
      makeDefect({ id: 3, poleNumber: 1 }),
    ]);

    expect(groups.map(([key, rows]) => [key, rows.length])).toEqual([
      ['о:1', 1],
      ['о:2', 2],
    ]);
  });

  it('группирует по пролёту', () => {
    const groups = groupByLocation([
      makeDefect({ id: 1, poleNumber: 0, spanRange: '10-15' }),
      makeDefect({ id: 2, poleNumber: 0, spanRange: '10-15' }),
      makeDefect({ id: 3, poleNumber: 0, spanRange: '20-25' }),
    ]);

    expect(groups.map(([key, rows]) => [key, rows.length])).toEqual([
      ['п:10-15', 2],
      ['п:20-25', 1],
    ]);
  });

  it('сортирует опоры по номеру', () => {
    const rows = [
      makeDefect({ id: 1, poleNumber: 10 }),
      makeDefect({ id: 2, poleNumber: 2 }),
      makeDefect({ id: 3, poleNumber: 1 }),
    ];

    expect(groupByLocation(rows).map(([key]) => key)).toEqual(['о:1', 'о:2', 'о:10']);
    expect(groupByLocation(rows, 'desc').map(([key]) => key)).toEqual(['о:10', 'о:2', 'о:1']);
  });
});
