'use strict';
// Resolve deps from server/node_modules
process.env.NODE_PATH = require('path').resolve(__dirname, '../server/node_modules');
require('module').Module._initPaths();

/**
 * cleanup-bad-lines.js
 *
 * Находит и удаляет "мусорные" линии из SAP, которые не являются реальными ВЛ:
 *   - строки с типами работ (Списание матер., ТО, Прочие работы...)
 *   - записи, название которых совпадает с классом напряжения (ВЛ-110 кВ и т.п.)
 *   - любые другие паттерны, указанные в PATTERNS
 *
 * Использование:
 *   node scripts/cleanup-bad-lines.js [--dry-run]
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const { query, execute } = require('../server/lib/fbDb');

const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) console.log('[DRY-RUN] — база не изменяется\n');

// Паттерны "мусорных" записей — строки, которые точно не являются линиями ВЛ
const PATTERNS = [
  '%Списание%',
  '%Прочие работы%',
  '%Прочие раб.%',
  '%СЛЭП%',
  '%ТО %',       // Техническое обслуживание как название линии
];

// Точные совпадения с классами напряжения (не должны быть названием линии)
const EXACT_VOLTAGE_NAMES = [
  'ВЛ-35 кВ', 'ВЛ-110 кВ', 'ВЛ-220 кВ', 'ВЛ-330 кВ', 'ВЛ-750 кВ',
];

async function main() {
  console.log(`Firebird: ${process.env.FB_HOST} → ${process.env.FB_DATABASE}\n`);

  // ── Собираем все "плохие" линии ──────────────────────────────────────────────
  const found = new Map(); // id → row

  // По паттернам LIKE
  for (const p of PATTERNS) {
    const rows = await query(
      `SELECT ID, NAME, FILIAL_ID, VOLTAGE_ID FROM LINES WHERE NAME LIKE ? ORDER BY ID`,
      [p]
    );
    for (const r of rows) found.set(r.id, r);
  }

  // Точные совпадения с классами напряжения
  for (const name of EXACT_VOLTAGE_NAMES) {
    const rows = await query(
      `SELECT ID, NAME, FILIAL_ID, VOLTAGE_ID FROM LINES WHERE NAME = ? ORDER BY ID`,
      [name]
    );
    for (const r of rows) found.set(r.id, r);
  }

  if (found.size === 0) {
    console.log('Мусорных линий не найдено. База чистая.');
    return setTimeout(() => process.exit(0), 300);
  }

  console.log(`Найдено записей для удаления: ${found.size}\n`);
  for (const r of found.values()) {
    console.log(`  ID=${r.id}  filialId=${r.filial_id}  voltageId=${r.voltage_id}  "${r.name}"`);
  }

  if (DRY_RUN) {
    console.log('\n[DRY-RUN] Запусти без --dry-run для удаления.');
    return setTimeout(() => process.exit(0), 300);
  }

  // ── Удаляем с каскадом ────────────────────────────────────────────────────────
  const ids = [...found.keys()];
  const placeholders = ids.map(() => '?').join(', ');

  // Дефекты из листков, привязанных к этим линиям
  await execute(
    `DELETE FROM DEFECT_RECORDS WHERE SHEET_ID IN (
       SELECT ID FROM INSPECTION_SHEETS WHERE LINE_ID IN (${placeholders})
     )`,
    ids
  );

  // Листки осмотра
  await execute(
    `DELETE FROM INSPECTION_SHEETS WHERE LINE_ID IN (${placeholders})`,
    ids
  );

  // Разрешения пользователей
  await execute(
    `DELETE FROM USER_ALLOWED_LINES WHERE LINE_ID IN (${placeholders})`,
    ids
  );

  // Сами линии
  await execute(
    `DELETE FROM LINES WHERE ID IN (${placeholders})`,
    ids
  );

  console.log(`\nУдалено ${ids.length} линий (IDs: ${ids.join(', ')}).`);
  console.log('Выполни node scripts/export-db-to-seed.js чтобы обновить seed-файлы.');
  setTimeout(() => process.exit(0), 500);
}

main().catch(err => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});
