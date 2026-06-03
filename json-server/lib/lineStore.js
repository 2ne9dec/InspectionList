/**
 * lineStore.js — чтение/запись per-line коллекций.
 *
 * Структура файлового хранилища:
 *   store/data/<collection>/<напряжение>/<линия>_<lineId>.json
 *
 * Запись атомарна: .tmp → rename.
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const { STORE_DIR, getLineStorePath } = require('./pathResolver');
const { seedDb } = require('./seed');

// ── Базовые операции ──────────────────────────────────────────────────────────

/**
 * Читает per-line коллекцию для заданного lineId.
 * Возвращает [] если файл не существует.
 */
function readLineStore(collection, lineId) {
  const fp = getLineStorePath(seedDb, collection, lineId);
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

/**
 * Атомарно записывает per-line коллекцию.
 * Создаёт промежуточные папки при необходимости.
 */
function saveLineStore(collection, lineId, data) {
  const fp  = getLineStorePath(seedDb, collection, lineId);
  const dir = path.dirname(fp);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = fp + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, fp);
}

// ── Агрегирующие операции ─────────────────────────────────────────────────────

/**
 * Читает ВСЕ записи из всех файлов коллекции (для поиска, статистики).
 * Рекурсивно обходит папки внутри store/data/<collection>/.
 */
function readAllLineStore(collection) {
  const dir = path.join(STORE_DIR, 'data', collection);
  if (!fs.existsSync(dir)) return [];
  const all = [];
  function scan(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        scan(path.join(d, entry.name));
      } else if (entry.isFile() && /\.json$/.test(entry.name) && !entry.name.endsWith('.tmp')) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(d, entry.name), 'utf8'));
          if (Array.isArray(data)) all.push(...data);
        } catch { /* повреждённый файл — пропускаем */ }
      }
    }
  }
  scan(dir);
  return all;
}

/**
 * Находит файл коллекции, содержащий запись с заданным id.
 * Возвращает { lineId, data: Array, filepath: string } или null.
 * Используется при PATCH/DELETE по id без знания lineId.
 */
function findLineStoreFile(collection, id) {
  const dir = path.join(STORE_DIR, 'data', collection);
  if (!fs.existsSync(dir)) return null;
  function scan(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const r = scan(path.join(d, entry.name));
        if (r) return r;
      } else if (entry.isFile() && /\.json$/.test(entry.name) && !entry.name.endsWith('.tmp')) {
        const fp = path.join(d, entry.name);
        try {
          const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
          if (Array.isArray(data) && data.some((r) => r.id === id)) {
            const found = data.find((r) => r.id === id);
            return { lineId: found?.lineId ?? null, data, filepath: fp };
          }
        } catch { /* пропускаем */ }
      }
    }
    return null;
  }
  return scan(dir);
}

/**
 * Возвращает массив lineId, для которых существуют файлы в коллекции.
 * Извлекает lineId из суффикса имени файла: <name>_<lineId>.json
 */
function listLineStoreLineIds(collection) {
  const dir = path.join(STORE_DIR, 'data', collection);
  if (!fs.existsSync(dir)) return [];
  const ids = [];
  function scan(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        scan(path.join(d, entry.name));
      } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.endsWith('.tmp')) {
        const m = entry.name.match(/_(\d+)\.json$/);
        if (m) ids.push(Number(m[1]));
      }
    }
  }
  scan(dir);
  return ids;
}

module.exports = {
  readLineStore,
  saveLineStore,
  readAllLineStore,
  findLineStoreFile,
  listLineStoreLineIds,
};
