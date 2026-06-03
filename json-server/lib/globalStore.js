/**
 * globalStore.js — чтение/запись глобальных (не привязанных к линии) коллекций.
 *
 * Коллекции:
 *   users — пользователи системы
 *   tasks — наряды
 *
 * Запись атомарна: сначала пишем во временный .tmp, затем переименовываем.
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const { STORE_DIR } = require('./pathResolver');

const STORE_NAMES = ['users', 'tasks'];

/**
 * Читает глобальную коллекцию по имени.
 * Возвращает [] если файл не существует.
 */
function readStore(name) {
  const fp = path.join(STORE_DIR, 'data', `${name}.json`);
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

/**
 * Атомарно записывает глобальную коллекцию.
 */
function saveStore(name, data) {
  const fp  = path.join(STORE_DIR, 'data', `${name}.json`);
  const tmp = fp + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, fp);
}

/**
 * Читает все глобальные коллекции сразу (legacy-compatible).
 */
function readDynDb() {
  const db = {};
  for (const name of STORE_NAMES) db[name] = readStore(name);
  return db;
}

/**
 * Сохраняет переданные глобальные коллекции (только присутствующие в объекте).
 */
function saveDynDb(data) {
  for (const name of STORE_NAMES) {
    if (name in data) saveStore(name, data[name]);
  }
}

module.exports = {
  STORE_NAMES,
  readStore,
  saveStore,
  readDynDb,
  saveDynDb,
};
