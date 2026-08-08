'use strict';

/**
 * remove-no-defect.js — удаляет из Firebird все записи дефектов
 * с elementId=26 (Дефекты отсутствуют) и defectTypeId=117,
 * а также сами справочные записи из ELEMENTS и DEFECT_TYPES.
 *
 * Запуск: node scripts/remove-no-defect.js
 */

const path = require('path');
process.env.NODE_PATH = path.resolve(__dirname, '../server/node_modules');
require('module').Module._initPaths();
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const { query, execute } = require('../server/lib/fbDb');

const ELEMENT_ID    = 26;
const DEFECT_TYPE_ID = 117;

async function main() {
  // Сколько записей дефектов затронуто
  const rows = await query(
    'SELECT COUNT(*) AS CNT FROM DEFECT_RECORDS WHERE ELEMENT_ID = ? OR DEFECT_ID = ?',
    [ELEMENT_ID, DEFECT_TYPE_ID]
  );
  const cnt = rows[0]?.cnt ?? rows[0]?.CNT ?? 0;
  console.log(`Дефектов для удаления: ${cnt}`);

  if (cnt > 0) {
    await execute(
      'DELETE FROM DEFECT_RECORDS WHERE ELEMENT_ID = ? OR DEFECT_ID = ?',
      [ELEMENT_ID, DEFECT_TYPE_ID]
    );
    console.log('Записи из DEFECTS удалены');
  }

  // Удаляем из справочников
  await execute('DELETE FROM DEFECT_TYPES WHERE ID = ?', [DEFECT_TYPE_ID]);
  console.log('Запись из DEFECT_TYPES удалена');

  await execute('DELETE FROM ELEMENTS WHERE ID = ?', [ELEMENT_ID]);
  console.log('Запись из ELEMENTS удалена');

  console.log('Готово.');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
