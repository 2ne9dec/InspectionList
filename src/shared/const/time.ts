/**
 * Временные константы — единый источник правды.
 * Используйте вместо магических чисел типа 86400000 или 1000 * 60 * 60.
 */

export const MS_PER_SECOND = 1_000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR   = 60 * MS_PER_MINUTE;
export const MS_PER_DAY    = 24 * MS_PER_HOUR;

/** Порог «просроченного» дефекта в днях (по умолчанию 30) */
export const OVERDUE_THRESHOLD_DAYS = 30;
