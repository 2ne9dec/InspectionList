import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateTempPassword } from './generatePassword';

const LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';

describe('generateTempPassword', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('возвращает 10 символов: 7 букв и 3 цифры из разрешённых алфавитов', () => {
    for (let i = 0; i < 100; i++) {
      const password = generateTempPassword();

      expect(password).toHaveLength(10);
      expect(password.match(/[A-Za-z]/g)).toHaveLength(7);
      expect(password.match(/\d/g)).toHaveLength(3);
      expect(
        [...password].every((c) => LETTERS.includes(c) || DIGITS.includes(c)),
      ).toBe(true);
    }
  });

  it('не содержит похожих символов 0/O/1/l/I', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateTempPassword()).not.toMatch(/[0O1lI]/);
    }
  });

  it('генерирует разные пароли', () => {
    const passwords = new Set(Array.from({ length: 25 }, () => generateTempPassword()));
    expect(passwords.size).toBe(25);
  });

  it('запрашивает случайные числа для 7 букв, 3 цифр и перемешивания', () => {
    const getRandomValues = vi.fn((buf: Uint32Array) => {
      buf.fill(0);
      return buf;
    });
    vi.stubGlobal('crypto', { getRandomValues });

    expect(generateTempPassword()).toBe('aaaaaaa222');
    expect(getRandomValues.mock.calls.map(([buf]) => buf.length)).toEqual([7, 3, 10]);
  });

  it('переставляет символы в порядке, который вернул crypto', () => {
    const values = [
      0, 1, 2, 3, 4, 5, 6, // буквы: a b c d e f g
      0, 1, 2, // цифры: 2 3 4
      9, 8, 7, 6, 5, 4, 3, 2, 1, 0, // перемешивание: обратный порядок
    ];
    let next = 0;
    vi.stubGlobal('crypto', {
      getRandomValues: (buf: Uint32Array) => {
        for (let i = 0; i < buf.length; i++) buf[i] = values[next++];
        return buf;
      },
    });

    expect(generateTempPassword()).toBe('432gfedcba');
  });
});
