/**
 * "2026-05-11" → "11.05.2026"
 * Пустая строка → "".
 */
export function formatIsoDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}
