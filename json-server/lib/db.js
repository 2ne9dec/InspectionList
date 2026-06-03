/**
 * db.js — тонкий оркестратор хранилища json-server.
 *
 * Инициализирует все подсистемы в правильном порядке и реэкспортирует
 * публичный API для использования в роутах.
 *
 * Порядок инициализации:
 *   1. pathResolver  — базовые пути (без зависимостей)
 *   2. seed          — загрузка справочников (зависит от pathResolver)
 *   3. globalStore   — глобальные коллекции (зависит от pathResolver)
 *   4. lineStore     — per-line коллекции (зависит от seed + pathResolver)
 *   5. migrations    — однократные миграции (зависит от lineStore)
 *   6. idCounters    — счётчики ID (зависит от globalStore + lineStore)
 *
 * Декомпозиция по модулям (Блок 5):
 *   pathResolver.js  — пути файловой системы
 *   seed.js          — справочники (только чтение)
 *   globalStore.js   — глобальные коллекции (users, tasks)
 *   lineStore.js     — per-line коллекции (inspectionSheets, defectRecords)
 *   migrations.js    — миграции при старте
 *   idCounters.js    — автоинкрементные счётчики ID
 */

'use strict';

const { STORE_DIR }   = require('./pathResolver');
const { seedDb }      = require('./seed');
const { readStore, saveStore, readDynDb, saveDynDb } = require('./globalStore');
const {
  readLineStore, saveLineStore,
  readAllLineStore, findLineStoreFile,
  listLineStoreLineIds,
} = require('./lineStore');
const { runMigrations }    = require('./migrations');
const { idCounters, initCounters, nextId } = require('./idCounters');

// Инициализация при загрузке модуля
runMigrations();
initCounters();

module.exports = {
  STORE_DIR,
  seedDb,
  // Глобальные коллекции
  readStore,
  saveStore,
  readDynDb,
  saveDynDb,
  // Per-line коллекции
  readLineStore,
  saveLineStore,
  readAllLineStore,
  findLineStoreFile,
  listLineStoreLineIds,
  // Счётчики ID
  nextId,
  idCounters,
};
