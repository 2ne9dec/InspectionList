/**
 * tenancy.js — middleware мультитенантной изоляции по filialId.
 *
 * Принцип:
 *   Каждый филиал имеет право читать/писать только свои линии ЛЭП.
 *   Если req.filialId задан — вычисляется список allowedLineIds из seedDb,
 *   и добавляется в req для дальнейшей фильтрации в роутах.
 *   Если filialId не задан (анонимный или admin без ограничений) — req.allowedLineIds = null,
 *   что означает «доступ ко всем».
 *
 * Кеш lineIds по filialId формируется один раз при загрузке модуля
 * из seedDb (статические справочники) — без доп. I/O при каждом запросе.
 *
 * Использование в роутах:
 *   const { tenancyMiddleware, filterByTenancy } = require('../lib/tenancy');
 *
 *   router.get('/defectRecords', (req, res) => {
 *     let records = readAllLineStore('defectRecords');
 *     records = filterByTenancy(req, records, (r) => r.lineId);
 *     res.json(records);
 *   });
 */

'use strict';

const { seedDb } = require('./seed');

// ── Кеш filialId → Set<lineId> ────────────────────────────────────────────────

/**
 * Строит карту filialId → Set<lineId> из seedDb.
 * Линии принадлежат к филиалу через поле line.filialId (если есть)
 * или через промежуточную таблицу filialVoltageFilter.
 */
function buildFilialLineMap() {
  const map = new Map(); // filialId → Set<lineId>

  const lines = seedDb.lines ?? [];
  // filialVoltageFilter может быть массивом [{filialId, voltageId}]
  // или объектом {filialId: [voltageId, ...]} — поддерживаем оба формата
  const filterRaw = seedDb.filialVoltageFilter ?? {};

  // Разрешённые voltageId для каждого филиала
  const filialVoltages = new Map(); // filialId → Set<voltageId>
  if (Array.isArray(filterRaw)) {
    for (const fv of filterRaw) {
      if (!filialVoltages.has(fv.filialId)) filialVoltages.set(fv.filialId, new Set());
      filialVoltages.get(fv.filialId).add(fv.voltageId);
    }
  } else {
    for (const [fid, vids] of Object.entries(filterRaw)) {
      const fidNum = Number(fid);
      if (!filialVoltages.has(fidNum)) filialVoltages.set(fidNum, new Set());
      for (const vid of (Array.isArray(vids) ? vids : [vids])) {
        filialVoltages.get(fidNum).add(Number(vid));
      }
    }
  }

  // Линии с прямым filialId
  for (const line of lines) {
    const fid = line.filialId ?? null;
    if (fid == null) continue;
    if (!map.has(fid)) map.set(fid, new Set());
    map.get(fid).add(line.id);
  }

  // Линии без прямого filialId — определяем через filialVoltageFilter
  for (const line of lines) {
    if (line.filialId != null) continue;
    for (const [fid, voltageIds] of filialVoltages) {
      if (voltageIds.has(line.voltageId)) {
        if (!map.has(fid)) map.set(fid, new Set());
        map.get(fid).add(line.id);
      }
    }
  }

  return map;
}

const FILIAL_LINE_MAP = buildFilialLineMap();

// ── Middleware ─────────────────────────────────────────────────────────────────

/**
 * Добавляет req.allowedLineIds {Set<number>|null} на основе req.filialId.
 * null означает «все линии разрешены» (admin без filialId или нет ограничений).
 * Требует authMiddleware выше в цепочке.
 */
function tenancyMiddleware(req, res, next) {
  if (req.filialId == null || req.isAdmin) {
    req.allowedLineIds = null; // нет ограничений
  } else {
    req.allowedLineIds = FILIAL_LINE_MAP.get(req.filialId) ?? new Set();
  }
  next();
}

// ── Вспомогательные функции для роутов ────────────────────────────────────────

/**
 * Фильтрует массив записей по allowedLineIds из req.
 *
 * @param {object}   req        — express request (с req.allowedLineIds)
 * @param {Array}    items      — массив записей
 * @param {function} getLineId  — (item) => lineId  (по умолчанию item => item.lineId)
 * @returns {Array} отфильтрованный массив
 */
function filterByTenancy(req, items, getLineId) {
  var fn = getLineId || function(i) { return i.lineId; };
  if (!req.allowedLineIds) return items;
  return items.filter(function(item) {
    var lid = fn(item);
    return lid == null || req.allowedLineIds.has(Number(lid));
  });
}

/**
 * Проверяет, имеет ли текущий запрос доступ к конкретному lineId.
 * @returns {boolean}
 */
function canAccessLine(req, lineId) {
  if (!req.allowedLineIds) return true;
  return req.allowedLineIds.has(Number(lineId));
}

module.exports = {
  tenancyMiddleware,
  filterByTenancy,
  canAccessLine,
  FILIAL_LINE_MAP,
};
