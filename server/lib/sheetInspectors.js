'use strict';

/** Единый вид: без лишних пробелов, "П. С." -> "П.С.". */
function normalizeInspector(name) {
  return String(name)
    .replace(/\s+/g, ' ')
    .replace(/\s*\.\s*/g, '.')
    .trim();
}

/** Разбирает "Иванов И.И., Петров П.П." в массив имён. */
function splitInspectors(value) {
  if (value == null) return [];
  return String(value)
    .split(',')
    .map(normalizeInspector)
    .filter(Boolean);
}

/**
 * Собирает уникальных осматривавших из исходных листков.
 * Если у листка уже есть INSPECTORS — берём его, иначе CREATED_BY.
 * Порядок сохраняем: сначала первый исходный листок, затем новые имена.
 */
function collectInspectors(sheets) {
  const seen = new Set();
  const result = [];
  for (const sheet of sheets ?? []) {
    const source = sheet?.inspectors ?? sheet?.INSPECTORS ?? sheet?.created_by ?? sheet?.createdBy;
    for (const name of splitInspectors(source)) {
      if (seen.has(name)) continue;
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

module.exports = { splitInspectors, collectInspectors };
