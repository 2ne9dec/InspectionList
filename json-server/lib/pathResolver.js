/**
 * pathResolver.js — разрешение файловых путей хранилища.
 *
 * Отвечает за:
 *   - Корневые пути SEED_DIR и STORE_DIR
 *   - Построение пути к per-line JSON-файлу коллекции
 *   - Безопасное преобразование имени в FS-компонент (safeFsName)
 */

'use strict';

const path = require('path');
const fs   = require('fs');

const SEED_DIR  = path.resolve(__dirname, '..', 'seed');
const STORE_DIR = path.resolve(__dirname, '..', 'store');

/**
 * Преобразует произвольную строку в безопасное имя для файловой системы.
 * Удаляет запрещённые символы, схлопывает пробелы/подчёркивания.
 */
function safeFsName(s) {
  return String(s)
    .replace(/[<>:"/\\|?*]+/g, '')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    || 'unknown';
}

/**
 * Возвращает полный путь к JSON-файлу per-line коллекции.
 * Структура: store/data/<collection>/<напряжение>/<линия>_<lineId>.json
 *
 * @param {object} seedDb — предзагруженный справочник (lines, voltages)
 * @param {string} collection — имя коллекции (coordinates, photos, ...)
 * @param {number|string} lineId
 */
function getLineStorePath(seedDb, collection, lineId) {
  const lid     = Number(lineId);
  const line    = (seedDb.lines    || []).find((l) => l.id === lid);
  const voltage = line ? (seedDb.voltages || []).find((v) => v.id === line.voltage_id) : null;
  const volDir  = voltage ? safeFsName(voltage.name) : 'other';
  const linePart = line ? `${safeFsName(line.name)}_${lid}` : String(lid);
  return path.join(STORE_DIR, 'data', collection, volDir, `${linePart}.json`);
}

module.exports = {
  SEED_DIR,
  STORE_DIR,
  safeFsName,
  getLineStorePath,
};
