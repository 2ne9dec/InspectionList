'use strict';
/**
 * add-indexes.js -- добавляет индексы в Firebird для ускорения типичных запросов.
 *
 * Запуск (один раз, после установки):
 *   node server/scripts/add-indexes.js
 *
 * Идемпотентен: проверяет существование индекса перед созданием.
 */

const path = require('path');
process.env.NODE_PATH = require('path').resolve(__dirname, '../server/node_modules');
require('module').Module._initPaths();
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const { query, execute } = require('../server/lib/fbDb');

const INDEXES = [
  {
    name:  'IDX_SHEETS_CREATED_DATE',
    sql:   'CREATE INDEX IDX_SHEETS_CREATED_DATE ON INSPECTION_SHEETS (CREATED_DATE)',
    desc:  'Фильтрация по дате осмотра',
  },
  {
    name:  'IDX_SHEETS_LINE_ID',
    sql:   'CREATE INDEX IDX_SHEETS_LINE_ID ON INSPECTION_SHEETS (LINE_ID)',
    desc:  'Выборка листков по линии',
  },
  {
    name:  'IDX_SHEETS_FILIAL_ID',
    sql:   'CREATE INDEX IDX_SHEETS_FILIAL_ID ON INSPECTION_SHEETS (FILIAL_ID)',
    desc:  'Выборка листков по филиалу',
  },
  {
    name:  'IDX_SHEETS_STATUS',
    sql:   'CREATE INDEX IDX_SHEETS_STATUS ON INSPECTION_SHEETS (STATUS)',
    desc:  'Фильтрация по статусу (active/archived)',
  },
  {
    name:  'IDX_DEFECTS_SHEET_ID',
    sql:   'CREATE INDEX IDX_DEFECTS_SHEET_ID ON DEFECT_RECORDS (SHEET_ID)',
    desc:  'JOIN дефектов к листку осмотра',
  },
  {
    name:  'IDX_DEFECTS_LINE_ID',
    sql:   'CREATE INDEX IDX_DEFECTS_LINE_ID ON DEFECT_RECORDS (LINE_ID)',
    desc:  'Поиск дефектов по линии',
  },
  {
    name:  'IDX_DEFECTS_IS_FIXED',
    sql:   'CREATE INDEX IDX_DEFECTS_IS_FIXED ON DEFECT_RECORDS (IS_FIXED)',
    desc:  'Агрегация счётчиков активных/исправленных дефектов',
  },
];

async function indexExists(name) {
  const rows = await query(
    `SELECT COUNT(*) AS cnt FROM RDB$INDICES WHERE TRIM(RDB$INDEX_NAME) = ?`,
    [name],
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}

async function main() {
  console.log('Добавляем индексы в Firebird...\n');

  for (const idx of INDEXES) {
    const exists = await indexExists(idx.name);
    if (exists) {
      console.log(`  ПРОПУСК  ${idx.name} — уже существует`);
      continue;
    }
    try {
      await execute(idx.sql);
      console.log(`  СОЗДАН   ${idx.name} — ${idx.desc}`);
    } catch (err) {
      console.error(`  ОШИБКА   ${idx.name}: ${err.message}`);
    }
  }

  console.log('\nГотово.');
  setTimeout(() => process.exit(0), 500);
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
