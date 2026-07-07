/** Первая буква строки заглавная, остальные без изменений. */
export const capitalizeFirst = (s: string): string =>
  s ? s[0].toUpperCase() + s.slice(1) : s;
