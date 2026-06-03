/**
 * Парсит пользовательский ввод опор:
 *   "12, 15, 18-20" → [12, 15, 18, 19, 20]
 * Игнорирует значения вне диапазона [poleStart, poleEnd].
 * Возвращает отсортированный список уникальных номеров опор.
 */
export function parseTargetPoles(input: string, poleStart: number, poleEnd: number): number[] {
  const result = new Set<number>();

  for (const part of input.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const dashIdx = trimmed.indexOf('-', 1); // с позиции 1 — чтобы не поймать унарный минус

    if (dashIdx !== -1) {
      const fromStr = trimmed.slice(0, dashIdx).trim();
      const toStr   = trimmed.slice(dashIdx + 1).trim();
      const from = Number(fromStr);
      const to   = Number(toStr);
      // Оба должны быть целыми положительными числами
      if (Number.isInteger(from) && Number.isInteger(to) && from > 0 && to > 0) {
        const min = Math.min(from, to);
        const max = Math.max(from, to);
        for (let i = min; i <= max; i++) {
          if (i >= poleStart && i <= poleEnd) result.add(i);
        }
      }
    } else {
      const n = Number(trimmed);
      if (Number.isInteger(n) && n > 0 && n >= poleStart && n <= poleEnd) result.add(n);
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}
