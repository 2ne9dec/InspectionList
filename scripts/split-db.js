'use strict';

/**
 * split-db.js — делит INSPECTIONLIST.FDB на 4 отдельные базы по филиалам.
 *
 * Результат:
 *   db/gomel.fdb    (filialId=1)
 *   db/zhlobin.fdb  (filialId=2)
 *   db/mozyr.fdb    (filialId=3)
 *   db/rechitsa.fdb (filialId=4)
 *
 * Запуск: node scripts/split-db.js
 */

const path = require('path');
const fs   = require('fs');
process.env.NODE_PATH = path.resolve(__dirname, '../server/node_modules');
require('module').Module._initPaths();
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const Firebird = require('node-firebird');

const SOURCE_DB = process.env.FB_DATABASE;
const DB_DIR    = path.join(__dirname, '../db');
const FB_CONFIG = {
  host:     process.env.FB_HOST     || '127.0.0.1',
  port:     Number(process.env.FB_PORT) || 3050,
  user:     process.env.FB_USER     || 'SYSDBA',
  password: process.env.FB_PASSWORD || 'masterkey',
};

const FILIALS = [
  { id: 1, name: 'gomel'   },
  { id: 2, name: 'zhlobin' },
  { id: 3, name: 'mozyr'   },
  { id: 4, name: 'rechitsa'},
];

/** Обёртка node-firebird → Promise */
function openDb(dbPath) {
  return new Promise((resolve, reject) => {
    Firebird.attach({ ...FB_CONFIG, database: dbPath }, (err, db) => {
      if (err) reject(err); else resolve(db);
    });
  });
}

function execSql(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(Object.assign(err, { sql }));
      else resolve(rows);
    });
  });
}

function closeDb(db) {
  return new Promise((resolve) => db.detach(resolve));
}

async function processFilial({ id, name }) {
  const destPath = path.join(DB_DIR, `${name}.fdb`);
  console.log(`\n=== ${name}.fdb (filialId=${id}) ===`);

  // Копируем исходную БД
  fs.copyFileSync(SOURCE_DB, destPath);
  console.log(`  Скопировано: ${destPath}`);

  const db = await openDb(destPath);

  try {
    // 1. Дефекты листков чужих филиалов
    await execSql(db,
      'DELETE FROM DEFECT_RECORDS WHERE SHEET_ID IN (SELECT ID FROM INSPECTION_SHEETS WHERE FILIAL_ID <> ?)',
      [id]
    );
    console.log(`  DEFECT_RECORDS (чужие): удалено`);

    // 2. Листки чужих филиалов
    await execSql(db, 'DELETE FROM INSPECTION_SHEETS WHERE FILIAL_ID <> ?', [id]);
    console.log(`  INSPECTION_SHEETS: удалено`);

    // 3. Пользователи чужих филиалов и admin (FILIAL_ID IS NULL)
    await execSql(db, 'DELETE FROM USER_ALLOWED_LINES WHERE USER_ID IN (SELECT ID FROM USERS WHERE FILIAL_ID <> ? OR FILIAL_ID IS NULL)', [id]);
    await execSql(db, 'DELETE FROM USER_ALLOWED_VOLTAGES WHERE USER_ID IN (SELECT ID FROM USERS WHERE FILIAL_ID <> ? OR FILIAL_ID IS NULL)', [id]);
    await execSql(db, 'DELETE FROM USERS WHERE FILIAL_ID <> ? OR FILIAL_ID IS NULL', [id]);
    console.log(`  USERS: удалены чужие + admin`);

    // 4. Filial voltage filter (ссылается на VOLTAGES — удаляем до VOLTAGES)
    await execSql(db, 'DELETE FROM FILIAL_VOLTAGE_FILTER WHERE FILIAL_ID <> ?', [id]);
    console.log(`  FILIAL_VOLTAGE_FILTER: удалено`);

    // 5. Линии чужих филиалов (ссылается на VOLTAGES — удаляем до VOLTAGES)
    await execSql(db, 'DELETE FROM LINES WHERE FILIAL_ID <> ?', [id]);
    console.log(`  LINES: удалено`);

    // 6. Напряжения чужих филиалов (после FVF и LINES)
    await execSql(db, 'DELETE FROM VOLTAGES WHERE FILIAL_ID <> ?', [id]);
    console.log(`  VOLTAGES: удалено`);

    // 7. Чужие филиалы из справочника (после VOLTAGES/LINES)
    await execSql(db, 'DELETE FROM FILIALS WHERE ID <> ?', [id]);
    console.log(`  FILIALS: оставлен только филиал ${id}`);

    // Проверка
    const users   = await execSql(db, 'SELECT COUNT(*) AS C FROM USERS');
    const sheets  = await execSql(db, 'SELECT COUNT(*) AS C FROM INSPECTION_SHEETS');
    const lines   = await execSql(db, 'SELECT COUNT(*) AS C FROM LINES');
    console.log(`  Итог: пользователей=${users[0].c ?? users[0].C}, листков=${sheets[0].c ?? sheets[0].C}, линий=${lines[0].c ?? lines[0].C}`);

  } finally {
    await closeDb(db);
  }
}

async function main() {
  if (!SOURCE_DB || !fs.existsSync(SOURCE_DB)) {
    console.error('FB_DATABASE не найден:', SOURCE_DB);
    process.exit(1);
  }

  fs.mkdirSync(DB_DIR, { recursive: true });
  console.log('Источник:', SOURCE_DB);

  for (const filial of FILIALS) {
    await processFilial(filial);
  }

  console.log('\nГотово! Файлы в папке db/');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
