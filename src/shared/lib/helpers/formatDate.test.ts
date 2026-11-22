import { describe, expect, it } from 'vitest';
import { formatDate } from './formatDate';

describe('formatDate', () => {
  it('переводит ISO-дату в формат ДД.ММ.ГГГГ', () => {
    expect(formatDate('2026-01-05')).toBe('05.01.2026');
    expect(formatDate('2025-12-31')).toBe('31.12.2025');
  });

  it('возвращает прочерк для пустого значения', () => {
    expect(formatDate('')).toBe('—');
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
  });

  it('возвращает прочерк для неполной даты', () => {
    expect(formatDate('2026-01')).toBe('—');
    expect(formatDate('2026')).toBe('—');
  });

  it('использует переданный emptyValue', () => {
    expect(formatDate(null, 'нет данных')).toBe('нет данных');
    expect(formatDate('', '—')).toBe('—');
  });
});
