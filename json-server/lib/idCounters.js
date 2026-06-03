/**
 * idCounters.js — автоинкрементные счётчики ID для всех коллекций.
 *
 * При старте сервера initCounters() сканирует все существующие записи
 * и выставляет счётчики на максимальный найденный id.
 * nextId(collection) возвращает следующий свободный id (atomic-safe в рамках
 * одного Node.js процесса — json-server однопоточный).
 */

'use strict';

const fs = require('fs');
const { iterAllFiles } = require('./helpers');
const { readStore }    = require('./globalStore');

const idCounters = {
  inspectionSheets: 0,
  defectRecords:    0,
  tasks:            0,
};

/**
 * Сканирует все хранилища и инициализирует счётчики по максимальному id.
 * Вызывается один раз при старте сервера.
 */
function initCounters() {
  // Листки осмотров и дефекты — из per-line файловой БД (data/)
  iterAllFiles((fp) => {
    const db = JSON.parse(fs.readFileSync(fp, 'utf8'));
    (db.inspectionSheets ?? []).forEach((r) => {
      if ((r.id ?? 0) > idCounters.inspectionSheets) idCounters.inspectionSheets = r.id;
    });
    (db.defectRecords ?? []).forEach((r) => {
      if ((r.id ?? 0) > idCounters.defectRecords) idCounters.defectRecords = r.id;
    });
  });

  // Глобальные коллекции
  readStore('tasks').forEach((r) => {
    if ((r.id ?? 0) > idCounters.tasks) idCounters.tasks = r.id;
  });

  console.log('[DB] Counters initialized:', JSON.stringify(idCounters));
}

/**
 * Возвращает следующий свободный id для указанной коллекции.
 * @param {keyof typeof idCounters} collection
 */
function nextId(collection) {
  idCounters[collection] = (idCounters[collection] ?? 0) + 1;
  return idCounters[collection];
}

module.exports = { idCounters, initCounters, nextId };
