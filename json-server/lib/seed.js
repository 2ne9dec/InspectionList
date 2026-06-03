/**
 * seed.js — загрузка статических справочников.
 *
 * Справочники (filials, voltages, lines, elements, ...) только читаются,
 * никогда не пишутся через API — это неизменяемые данные конфигурации.
 *
 * seedDb инициализируется один раз при старте сервера.
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const { SEED_DIR } = require('./pathResolver');

const SEED_FILES = [
  'filials',
  'voltages',
  'lines',
  'elements',
  'defectTypes',
  'phases',
  'phaseElementIds',
  'filialVoltageFilter',
];

/**
 * Загружает все справочные файлы из SEED_DIR.
 * filialVoltageFilter — объект ({}), остальные — массивы ([]).
 */
function loadSeed() {
  const db = {};
  for (const name of SEED_FILES) {
    const fp = path.join(SEED_DIR, `${name}.json`);
    db[name] = fs.existsSync(fp)
      ? JSON.parse(fs.readFileSync(fp, 'utf8'))
      : (name === 'filialVoltageFilter' ? {} : []);
  }
  return db;
}

// Загружаем при импорте модуля — нужен для pathResolver в других модулях
const seedDb = loadSeed();

module.exports = { seedDb, loadSeed };
