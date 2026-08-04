'use strict';
// Resolve deps from server/node_modules
process.env.NODE_PATH = require('path').resolve(__dirname, '../server/node_modules');
require('module').Module._initPaths();


/**
 * cleanup-old-zhlobin-lines.js
 *
 * Удаляет старые жлобинские линии (IDs 1–84, введённые вручную)
 * и оставляет только SAP-линии для Жлобина (IDs 182–252).
 *
 * Порядок:
 *   1. Показывает, сколько листков/дефектов ссылаются на старые линии
 *   2. Удаляет DEFECT_RECORDS из листков этих линий
 *   3. Удаляет INSPECTION_SHEETS, привязанные к старым линиям
 *   4. Удаляет USER_ALLOWED_LINES, привязанные к старым линиям
 *   5. Удаляет LINES IDs 1–84
 *
 * Использование:
 *   node scripts/cleanup-old-zhlobin-lines.js [--dry-run]
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const { query, execute } = require('../server/lib/fbDb');

const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) console.log('[DRY-RUN] — база не изменяется\n');

// Старые жлобинские линии (seed из lines.json)
const OLD_MIN_ID = 1;
const OLD_MAX_ID = 84;

async function main() {
  console.log(`Firebird: ${process.env.FB_HOST} → ${process.env.FB_DATABASE}\n`);

  // ── 1. Статистика ─────────────────────────────────────────────────────────
  const sheets = await query(
    `SELECT COUNT(*) AS CNT FROM INSPECTION_SHEETS WHERE LINE_ID BETWEEN ? AND ?`,
    [OLD_MIN_ID, OLD_MAX_ID]
  );
  const defects = await query(
    `SELECT COUNT(*) AS CNT FROM DEFECT_RECORDS WHERE LINE_ID BETWEEN ? AND ?`,
    [OLD_MIN_ID, OLD_MAX_ID]
  );
  const ual = await query(
    `SELECT COUNT(*) AS CNT FROM USER_ALLOWED_LINES WHERE LINE_ID BETWEEN ? AND ?`,
    [OLD_MIN_ID, OLD_MAX_ID]
  );

  console.log(`Зависимости от линий 1–84:`);
  console.log(`  INSPECTION_SHEETS:  ${sheets[0].cnt}`);
  console.log(`  DEFECT_RECORDS:     ${defects[0].cnt}`);
  console.log(`  USER_ALLOWED_LINES: ${ual[0].cnt}`);

  if (!DRY_RUN) {
    // ── 2. Удаляем дефекты из этих листков ───────────────────────────────────
    await execute(
      `DELETE FROM DEFECT_RECORDS
       WHERE SHEET_ID IN (
         SELECT ID FROM INSPECTION_SHEETS WHERE LINE_ID BETWEEN ? AND ?
       )`,
      [OLD_MIN_ID, OLD_MAX_ID]
    );
    console.log('\nDEFECT_RECORDS удалены (из старых листков)');

    // ── 3. Удаляем листки ─────────────────────────────────────────────────────
    await execute(
      `DELETE FROM INSPECTION_SHEETS WHERE LINE_ID BETWEEN ? AND ?`,
      [OLD_MIN_ID, OLD_MAX_ID]
    );
    console.log('INSPECTION_SHEETS удалены');

    // ── 4. Удаляем USER_ALLOWED_LINES ─────────────────────────────────────────
    await execute(
      `DELETE FROM USER_ALLOWED_LINES WHERE LINE_ID BETWEEN ? AND ?`,
      [OLD_MIN_ID, OLD_MAX_ID]
    );
    console.log('USER_ALLOWED_LINES очищены');

    // ── 5. Удаляем старые линии ───────────────────────────────────────────────
    await execute(
      `DELETE FROM LINES WHERE ID BETWEEN ? AND ?`,
      [OLD_MIN_ID, OLD_MAX_ID]
    );
    console.log(`LINES 1–84 удалены`);

    console.log('\nГотово. Жлобинские линии теперь только из SAP (IDs 182–252).');
  }

  setTimeout(() => process.exit(0), 500);
}

main().catch(err => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});
