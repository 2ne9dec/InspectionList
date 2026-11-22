/** Разбор фильтра «опора/пролёт»: "5", "5-10", "5 – 10". */
export function parsePoleFilter(filter: string): { min: number; max: number } | null {
  const f = filter.trim();
  if (!f) return null;
  const range = f.match(/^(\d+)\s*[-\u2013]\s*(\d+)$/);
  if (range) return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
  const single = f.match(/^(\d+)$/);
  if (single) {
    const n = parseInt(single[1], 10);
    return { min: n, max: n };
  }
  return null;
}

/** Пересекается ли пролёт дефекта с фильтром. */
export function matchesSpanRange(
  spanRange: string | null | undefined,
  min: number,
  max: number,
): boolean {
  if (!spanRange) return false;
  const rangeM = spanRange.match(/^(\d+)\s*[-\u2013]\s*(\d+)$/);
  if (rangeM) {
    const sMin = parseInt(rangeM[1], 10);
    const sMax = parseInt(rangeM[2], 10);
    return sMin <= max && sMax >= min;
  }
  const singleM = spanRange.match(/^(\d+)$/);
  if (singleM) {
    const n = parseInt(singleM[1], 10);
    return n >= min && n <= max;
  }
  return false;
}
