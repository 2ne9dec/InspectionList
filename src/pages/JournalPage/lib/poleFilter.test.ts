import { matchesSpanRange, parsePoleFilter } from './poleFilter';

describe('parsePoleFilter', () => {
  it('разбирает одиночную опору и диапазон', () => {
    expect(parsePoleFilter('5')).toEqual({ min: 5, max: 5 });
    expect(parsePoleFilter('5-10')).toEqual({ min: 5, max: 10 });
    expect(parsePoleFilter('5 – 10')).toEqual({ min: 5, max: 10 });
  });

  it('возвращает null для пустого и нечислового значения', () => {
    expect(parsePoleFilter('')).toBeNull();
    expect(parsePoleFilter('   ')).toBeNull();
    expect(parsePoleFilter('abc')).toBeNull();
  });
});

describe('matchesSpanRange', () => {
  it('проверяет одиночный пролёт', () => {
    expect(matchesSpanRange('7', 5, 10)).toBe(true);
    expect(matchesSpanRange('4', 5, 10)).toBe(false);
  });

  it('проверяет пересечение диапазонов', () => {
    expect(matchesSpanRange('8-12', 5, 10)).toBe(true);
    expect(matchesSpanRange('11-15', 5, 10)).toBe(false);
    expect(matchesSpanRange('5-10', 5, 10)).toBe(true);
  });

  it('возвращает false для пустого и нечислового значения', () => {
    expect(matchesSpanRange(null, 5, 10)).toBe(false);
    expect(matchesSpanRange(undefined, 5, 10)).toBe(false);
    expect(matchesSpanRange('abc', 5, 10)).toBe(false);
  });
});
