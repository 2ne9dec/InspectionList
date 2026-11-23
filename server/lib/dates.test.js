// @vitest-environment node
const { isIsoDate, normalizeIsoDate } = require('./dates');

describe('server dates', () => {
  it('принимает только ISO-дату', () => {
    expect(isIsoDate('2026-04-25')).toBe(true);
    expect(isIsoDate('25.04.2026')).toBe(false);
    expect(isIsoDate('25.04.01')).toBe(false);
    expect(isIsoDate('2026-4-5')).toBe(false);
  });

  it('нормализует пустое значение в null', () => {
    expect(normalizeIsoDate(null)).toBeNull();
    expect(normalizeIsoDate(undefined)).toBeNull();
    expect(normalizeIsoDate('')).toBeNull();
  });

  it('возвращает ISO-дату без изменений', () => {
    expect(normalizeIsoDate(' 2026-04-25 ')).toBe('2026-04-25');
  });

  it('не угадывает двузначный год', () => {
    expect(normalizeIsoDate('25.04.01')).toBeNull();
    expect(normalizeIsoDate('25.04.2026')).toBeNull();
  });
});
