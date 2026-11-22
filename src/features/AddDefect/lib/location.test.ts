import { isSpanValid, parsePoleList } from './location';

describe('parsePoleList', () => {
  it('разбирает список и диапазон', () => {
    expect(parsePoleList('1, 3, 5-7', 1, 10)).toEqual([1, 3, 5, 6, 7]);
  });

  it('понимает длинное тире', () => {
    expect(parsePoleList('5–7', 1, 10)).toEqual([5, 6, 7]);
  });

  it('возвращает пустой массив при выходе за границы', () => {
    expect(parsePoleList('1-11', 1, 10)).toEqual([]);
    expect(parsePoleList('0', 1, 10)).toEqual([]);
  });

  it('возвращает пустой массив для обратного диапазона', () => {
    expect(parsePoleList('7-5', 1, 10)).toEqual([]);
  });

  it('возвращает пустой массив для нечислового ввода', () => {
    expect(parsePoleList('abc', 1, 10)).toEqual([]);
    expect(parsePoleList('', 1, 10)).toEqual([]);
  });
});

describe('isSpanValid', () => {
  it('принимает одиночный пролёт и диапазон', () => {
    expect(isSpanValid('5', 1, 10)).toBe(true);
    expect(isSpanValid('3-7', 1, 10)).toBe(true);
  });

  it('отклоняет диапазон вне границ', () => {
    expect(isSpanValid('0-5', 1, 10)).toBe(false);
    expect(isSpanValid('8-12', 1, 10)).toBe(false);
  });

  it('отклоняет обратный диапазон и пустую строку', () => {
    expect(isSpanValid('7-3', 1, 10)).toBe(false);
    expect(isSpanValid('', 1, 10)).toBe(false);
  });
});
