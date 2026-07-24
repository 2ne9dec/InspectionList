'use strict';

/**
 * tenancy.js -- мультитенантная изоляция по filialId.
 *
 * При старте сервера вызвать initTenancy() -- она строит карту
 * filialId -> Set<lineId> из Firebird.
 *
 * Middleware и хелперы остаются синхронными (карта в памяти).
 */

const { query } = require('./fbDb');

let FILIAL_LINE_MAP = new Map(); // filialId (number) -> Set<lineId>

/**
 * Строит карту доступа из таблиц LINES и FILIAL_VOLTAGE_FILTER.
 * Вызывается один раз при старте.
 */
async function initTenancy() {
  const lines = await query('SELECT ID, FILIAL_ID, VOLTAGE_ID FROM LINES');
  const fvf   = await query('SELECT FILIAL_ID, VOLTAGE_ID FROM FILIAL_VOLTAGE_FILTER');

  // filialId -> Set<voltageId> из фильтра напряжений
  const filialVoltages = new Map();
  for (const r of fvf) {
    if (!filialVoltages.has(r.filial_id)) filialVoltages.set(r.filial_id, new Set());
    filialVoltages.get(r.filial_id).add(r.voltage_id);
  }

  const map = new Map();

  for (const line of lines) {
    // Прямая привязка: line.filial_id задан
    if (line.filial_id != null) {
      if (!map.has(line.filial_id)) map.set(line.filial_id, new Set());
      map.get(line.filial_id).add(line.id);
    }

    // Косвенная привязка: через filialVoltageFilter
    for (const [fid, voltageIds] of filialVoltages) {
      if (voltageIds.has(line.voltage_id)) {
        if (!map.has(fid)) map.set(fid, new Set());
        map.get(fid).add(line.id);
      }
    }
  }

  FILIAL_LINE_MAP = map;
  console.log('[tenancy] Line map built:', map.size, 'filials');
}

/**
 * Middleware: добавляет req.allowedLineIds (Set или null).
 * null = нет ограничений (admin или нет filialId).
 */
function tenancyMiddleware(req, res, next) {
  if (req.filialId == null || req.isAdmin) {
    req.allowedLineIds = null;
  } else {
    req.allowedLineIds = FILIAL_LINE_MAP.get(req.filialId) ?? new Set();
  }
  next();
}

/**
 * Фильтрует массив по allowedLineIds.
 * getLineId(item) -> lineId  (по умолчанию item.lineId)
 */
function filterByTenancy(req, items, getLineId) {
  const fn = getLineId || ((i) => i.lineId);
  if (!req.allowedLineIds) return items;
  return items.filter((item) => {
    const lid = fn(item);
    return lid == null || req.allowedLineIds.has(Number(lid));
  });
}

/**
 * Проверяет доступ к конкретной линии.
 */
function canAccessLine(req, lineId) {
  if (!req.allowedLineIds) return true;
  return req.allowedLineIds.has(Number(lineId));
}

/**
 * Строит фрагмент WHERE для фильтрации по LINE_ID.
 * Возвращает { sql, params } для вставки в запрос.
 */
function lineWhereClause(req, col = 'LINE_ID') {
  if (!req.allowedLineIds) return { sql: '', params: [] };
  const ids = [...req.allowedLineIds];
  if (ids.length === 0) return { sql: ` AND 1=0`, params: [] };
  return {
    sql:    ` AND ${col} IN (${ids.map(() => '?').join(',')})`,
    params: ids,
  };
}

module.exports = {
  initTenancy,
  tenancyMiddleware,
  filterByTenancy,
  canAccessLine,
  lineWhereClause,
};
