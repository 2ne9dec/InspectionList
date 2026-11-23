/** Проверки места дефекта: опоры и пролёты. */

/**
 * Parses "1, 3, 5-7" -> [1, 3, 5, 6, 7].
 * Returns empty array if any value is outside [min, max].
 */
export function parsePoleList(raw: string, min: number, max: number): number[] {
  const result: number[] = [];
  for (const part of raw.split(',')) {
    const t = part.trim();
    const range = t.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (range) {
      const a = Number(range[1]), b = Number(range[2]);
      if (a > b || a < min || b > max) return [];
      for (let i = a; i <= b; i++) result.push(i);
    } else {
      const n = Number(t);
      if (!Number.isInteger(n) || n < min || n > max) return [];
      result.push(n);
    }
  }
  return result;
}

/**
 * Validates span range string e.g. "3-7" or "5".
 * maxSpan = poleEnd - 1 (number of spans = number of poles - 1).
 */
export function isSpanValid(raw: string, minSpan: number, maxSpan: number): boolean {
  const t = raw.trim();
  if (!t) return false;
  const range = t.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (range) {
    const a = Number(range[1]), b = Number(range[2]);
    return a >= minSpan && b <= maxSpan && a <= b;
  }
  const n = Number(t);
  return Number.isInteger(n) && n >= minSpan && n <= maxSpan;
}
