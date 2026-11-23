import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { daysSince, isOverdue } from './isOverdue';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('isOverdue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('считает просроченной запись старше порога в 30 дней', () => {
    const date = new Date(Date.now() - 31 * DAY_MS).toISOString();
    expect(isOverdue(date)).toBe(true);
  });

  it('не считает просроченной свежую запись', () => {
    const date = new Date(Date.now() - 5 * DAY_MS).toISOString();
    expect(isOverdue(date)).toBe(false);
  });

  it('не считает просроченной запись ровно на границе порога', () => {
    const date = new Date(Date.now() - 30 * DAY_MS).toISOString();
    expect(isOverdue(date)).toBe(false);
  });

  it('учитывает переданный порог в днях', () => {
    const date = new Date(Date.now() - 10 * DAY_MS).toISOString();
    expect(isOverdue(date, 7)).toBe(true);
    expect(isOverdue(date, 14)).toBe(false);
  });

  it('не считает просроченной дату из будущего', () => {
    const date = new Date(Date.now() + 5 * DAY_MS).toISOString();
    expect(isOverdue(date)).toBe(false);
  });

  it('возвращает false для пустой даты', () => {
    expect(isOverdue('')).toBe(false);
  });
});

describe('daysSince', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-10T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('считает количество полных дней с момента обнаружения', () => {
    const date = new Date(Date.now() - 3 * DAY_MS).toISOString();
    expect(daysSince(date)).toBe(3);
  });

  it('возвращает 0 для сегодняшней даты', () => {
    expect(daysSince(new Date(Date.now()).toISOString())).toBe(0);
  });

  it('округляет неполный день вниз', () => {
    const date = new Date(Date.now() - (2 * DAY_MS + 60 * 60 * 1000)).toISOString();
    expect(daysSince(date)).toBe(2);
  });
});
