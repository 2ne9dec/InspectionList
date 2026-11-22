import { parseTargetPoles } from './parseTargetPoles';

describe('parseTargetPoles', () => {
  it('разбирает список и диапазон', () => {
    expect(parseTargetPoles('12, 15, 18-20', 10, 30)).toEqual([12, 15, 18, 19, 20]);
  });

  it('сортирует и убирает дубли', () => {
    expect(parseTargetPoles('15, 12, 12, 13', 10, 30)).toEqual([12, 13, 15]);
  });

  it('поддерживает обратный диапазон', () => {
    expect(parseTargetPoles('20-18', 10, 30)).toEqual([18, 19, 20]);
  });

  it('отбрасывает значения вне диапазона', () => {
    expect(parseTargetPoles('1, 10, 31, 40', 10, 30)).toEqual([10]);
  });

  it('игнорирует пустые и отрицательные значения', () => {
    expect(parseTargetPoles(', -5, , 12', 10, 30)).toEqual([12]);
  });
});
