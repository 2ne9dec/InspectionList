/** Возвращает true если дефект активен и обнаружен более N дней назад */
export function isOverdue(dateFound: string, thresholdDays = 30): boolean {
  if (!dateFound) return false;
  const ms = Date.now() - new Date(dateFound).getTime();
  return ms > thresholdDays * 24 * 60 * 60 * 1000;
}

/** Возвращает количество дней с момента обнаружения */
export function daysSince(dateFound: string): number {
  return Math.floor((Date.now() - new Date(dateFound).getTime()) / (24 * 60 * 60 * 1000));
}
