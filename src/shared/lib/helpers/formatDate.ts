/**
 * Форматирует ISO-дату «гггг-мм-дд» → «дд.мм.гггг».
 * @param emptyValue — что вернуть для пустого/null значения (по умолчанию «—»).
 */
export function formatDate(iso: string | null | undefined, emptyValue = '—'): string {
  if (!iso) return emptyValue;
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return emptyValue;
  return `${d}.${m}.${y}`;
}
