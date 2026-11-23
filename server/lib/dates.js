'use strict';

/** ISO-дата без времени: YYYY-MM-DD. */
function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? '').trim());
}

/**
 * Приводит дату к ISO или возвращает null.
 * Двузначные годы и локальные форматы (25.04.01) намеренно не угадываем:
 * именно из-за такого «угадывания» Firebird записал 2026 как 2001.
 */
function normalizeIsoDate(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  return isIsoDate(s) ? s : null;
}

module.exports = { isIsoDate, normalizeIsoDate };
