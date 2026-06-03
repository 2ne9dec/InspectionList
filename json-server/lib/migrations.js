/**
 * migrations.js — однократные миграции хранилища при старте сервера.
 * Все функции идемпотентны: проверяют наличие старых файлов перед работой.
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const { STORE_DIR } = require('./pathResolver');
const { saveLineStore } = require('./lineStore');

/**
 * Мигрирует store/<storeName>.json → per-line коллекцию <collection>/.
 */
function migrateFlatStore(storeName, collection, getLineId) {
  const fp = path.join(STORE_DIR, `${storeName}.json`);
  if (!fs.existsSync(fp)) return 0;
  let all;
  try { all = JSON.parse(fs.readFileSync(fp, 'utf8')); } catch { return 0; }
  if (!Array.isArray(all) || all.length === 0) {
    fs.renameSync(fp, fp + '.migrated');
    return 0;
  }
  const byLine = new Map();
  for (const item of all) {
    const lid = getLineId(item);
    if (lid == null) continue;
    if (!byLine.has(lid)) byLine.set(lid, []);
    byLine.get(lid).push(item);
  }
  for (const [lid, items] of byLine) saveLineStore(collection, lid, items);
  fs.renameSync(fp, fp + '.migrated');
  console.log(`[DB] Migrated ${storeName}.json → ${byLine.size} файлов в ${collection}/`);
  return byLine.size;
}

/**
 * Запускает все миграции при старте сервера.
 */
function runMigrations() {
  // Миграции устаревших форматов не требуются
}

module.exports = { runMigrations, migrateFlatStore };
