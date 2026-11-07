const LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS  = '23456789';

function pick(alphabet: string, n: number): string[] {
  const buf = new Uint32Array(n);
  crypto.getRandomValues(buf);
  return Array.from(buf, (x) => alphabet[x % alphabet.length]);
}

/**
 * Временный пароль для выдачи пользователю: 10 символов, буквы и цифры
 * (без похожих символов 0/O, 1/l/I). Пользователь сменит его при первом входе.
 */
export function generateTempPassword(): string {
  const chars = [...pick(LETTERS, 7), ...pick(DIGITS, 3)];
  const order = new Uint32Array(chars.length);
  crypto.getRandomValues(order);
  return chars
    .map((c, i) => ({ c, k: order[i] }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.c)
    .join('');
}
