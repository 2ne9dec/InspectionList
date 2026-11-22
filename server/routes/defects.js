'use strict';
const { requireRole } = require('../lib/auth');

/**
 * routes/defects.js -- дефекты (Firebird).
 *
 * GET    /defectRecords?sheetId=N
 * GET    /defectCounts
 * GET    /defectTrends?lineId=N
 * GET    /poleDefectStatus?lineId=N
 * POST   /defectRecords
 * PATCH  /defectRecords/:id
 * DELETE /defectRecords/:id
 * DELETE /defectRecordsBySheet/:sheetId
 */

const { Router } = require('express');
const { query, execute, queryOne, nextId } = require('../lib/fbDb');
const { canAccessLine, canAccessFilial, lineWhereClause } = require('../lib/tenancy');
const { requirePermission, hasPermission } = require('../lib/permissions');

const NO_DEFECT_ID = 117; // маркер «дефекты отсутствуют» — не считается дефектом

const PATCH_ALLOWED = new Set([
  'isFixed', 'dateFixed', 'inspectorFix', 'inspectorFind', 'notes', 'status',
  'masterConclusion', 'resolutionDeadline', 'masterName', 'fixWorkVolume',
  'poleNumber', 'spanRange', 'defectId', 'phaseId', 'insulatorCount', 'dateFound',
  'customName',
]);

/** Поля, задаваемые при внесении дефекта: исправляются (право defects.edit), пока дефект не устранён. */
const CORE_FIELDS = ['poleNumber', 'spanRange', 'defectId', 'phaseId', 'insulatorCount', 'dateFound'];

// JS key -> SQL column для PATCH
const PATCH_COLS = {
  isFixed:            'IS_FIXED',
  dateFixed:          'DATE_FIXED',
  inspectorFix:       'INSPECTOR_FIX',
  inspectorFind:      'INSPECTOR_FIND',
  notes:              'NOTES',
  status:             'STATUS',
  masterConclusion:   'MASTER_CONCLUSION',
  resolutionDeadline: 'RESOLUTION_DEADLINE',
  masterName:         'MASTER_NAME',
  fixWorkVolume:      'FIX_WORK_VOLUME',
  poleNumber:         'POLE_NUMBER',
  spanRange:          'SPAN_RANGE',
  defectId:           'DEFECT_ID',
  phaseId:            'PHASE_ID',
  insulatorCount:     'INSULATOR_COUNT',
  dateFound:          'DATE_FOUND',
  customName:         'CUSTOM_NAME',
};

const DATE_PATCH_COLS = new Set(['dateFixed', 'resolutionDeadline', 'dateFound']);

/**
 * Пролёты в едином виде: "47-48" (без пробелов, с обычным дефисом).
 * Нужно и для поиска дубликатов, и для группировки на клиенте.
 */
function normalizeSpan(raw) {
  if (raw == null) return null;
  const t = String(raw).trim().replace(/[\u2013\u2014]/g, '-').replace(/\s*-\s*/g, '-');
  return t || null;
}

/** Свободное описание дефекта (вид «Линейная арматура»). */
function normalizeCustomName(raw) {
  if (raw == null) return null;
  const t = String(raw).trim().replace(/\s+/g, ' ');
  // 200 символов с запасом помещаются в VARCHAR(500) Firebird (UTF-8, до 2 байт/символ)
  return t ? t.slice(0, 200) : null;
}

/**
 * Проверка и приведение исправляемых полей дефекта. Возвращает { values } или { error }.
 * cur — текущая запись (для проверки дубликата с итоговыми значениями).
 */
async function validateCoreFields(body, cur, id) {
  const v = {};
  if ('poleNumber' in body) {
    const n = Number(body.poleNumber);
    if (!Number.isInteger(n) || n < 0 || n > 100000) return { error: 'Неверный номер опоры' };
    v.poleNumber = n;
  }
  if ('spanRange' in body) {
    const t = normalizeSpan(body.spanRange) ?? '';
    if (t && !/^\d+(-\d+)?$/.test(t)) return { error: 'Неверно указаны пролёты (пример: 5 или 3-7)' };
    v.spanRange = t || null;
  }
  if ('defectId' in body) {
    const n = Number(body.defectId);
    if (!Number.isInteger(n) || !(await queryOne('SELECT ID FROM DEFECT_TYPES WHERE ID = ?', [n])))
      return { error: 'Неизвестный вид дефекта' };
    v.defectId = n;
  }
  if ('phaseId' in body) {
    if (body.phaseId == null || body.phaseId === '') v.phaseId = null;
    else {
      const n = Number(body.phaseId);
      if (!Number.isInteger(n) || !(await queryOne('SELECT ID FROM PHASES WHERE ID = ?', [n])))
        return { error: 'Неизвестная фаза' };
      v.phaseId = n;
    }
  }
  if ('insulatorCount' in body) {
    if (body.insulatorCount == null || body.insulatorCount === '') v.insulatorCount = null;
    else {
      const n = Number(body.insulatorCount);
      if (!Number.isInteger(n) || n < 1 || n > 100) return { error: 'Неверное количество изоляторов' };
      v.insulatorCount = n;
    }
  }
  if ('dateFound' in body) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.dateFound ?? ''))) return { error: 'Укажите дату обнаружения' };
    v.dateFound = String(body.dateFound);
  }

  // Место: опора (номер > 0, пролётов нет) или пролёты (номер опоры 0)
  const pole = v.poleNumber ?? Number(cur.pole_number);
  const span = 'spanRange' in v ? v.spanRange : cur.span_range;
  if (!span && pole <= 0) return { error: 'Укажите опору или пролёты' };

  // Дубликат: такой же активный дефект на том же месте в листке
  const defectId = v.defectId ?? Number(cur.defect_id);
  const phaseId  = 'phaseId' in v ? v.phaseId : (cur.phase_id ?? null);
  const customName = 'customName' in body
    ? normalizeCustomName(body.customName)
    : (cur.custom_name ?? null);
  const dup = await queryOne(
    `SELECT ID FROM DEFECT_RECORDS
     WHERE SHEET_ID = ? AND ID != ? AND POLE_NUMBER = ? AND DEFECT_ID = ?
       AND (PHASE_ID = ? OR (PHASE_ID IS NULL AND ? IS NULL))
       AND (SPAN_RANGE = ? OR (SPAN_RANGE IS NULL AND ? IS NULL))
       AND (CUSTOM_NAME = ? OR (CUSTOM_NAME IS NULL AND ? IS NULL))
       AND IS_FIXED = 0 AND (STATUS IS NULL OR STATUS != 'rejected')`,
    [cur.sheet_id, id, pole, defectId, phaseId, phaseId, span ?? null, span ?? null,
     customName, customName],
  );
  if (dup) return { error: 'Такой дефект уже есть на этом месте в листке', status: 409 };
  return { values: v };
}

const router = Router();

// ── Маппер ────────────────────────────────────────────────────────────────────
function toDefect(r) {
  return {
    id:                 r.id,
    sheetId:            r.sheet_id,
    lineId:             r.line_id             ?? null,
    poleNumber:         r.pole_number,
    defectId:           r.defect_id,
    phaseId:            r.phase_id            ?? null,
    elementId:          r.element_id          ?? null,
    dateFound:          r.date_found          ?? null,
    inspectorFind:      r.inspector_find      ?? null,
    isFixed:            r.is_fixed === 1,
    dateFixed:          r.date_fixed          ?? null,
    inspectorFix:       r.inspector_fix       ?? null,
    insulatorCount:     r.insulator_count     ?? null,
    spanRange:          r.span_range          ?? null,
    notes:              r.notes               ?? null,
    status:             r.status              ?? null,
    masterConclusion:   r.master_conclusion   ?? null,
    resolutionDeadline: r.resolution_deadline ?? null,
    masterName:         r.master_name         ?? null,
    fixWorkVolume:      r.fix_work_volume     ?? null,
    customName:         r.custom_name         ?? null,
    sapCode:            r.sap_code            ?? null,
  };
}

const SELECT_DEFECT = `
  SELECT ID, SHEET_ID, LINE_ID, POLE_NUMBER, DEFECT_ID, PHASE_ID, ELEMENT_ID,
         CAST(DATE_FOUND AS VARCHAR(10))          AS DATE_FOUND,
         INSPECTOR_FIND, IS_FIXED,
         CAST(DATE_FIXED AS VARCHAR(10))          AS DATE_FIXED,
         INSPECTOR_FIX, INSULATOR_COUNT, SPAN_RANGE, NOTES, STATUS,
         MASTER_CONCLUSION,
         CAST(RESOLUTION_DEADLINE AS VARCHAR(10)) AS RESOLUTION_DEADLINE,
         MASTER_NAME, FIX_WORK_VOLUME, CUSTOM_NAME, SAP_CODE
  FROM DEFECT_RECORDS`;

/**
 * SAP-код опоры = SAP-код линии. Заполняем только для Жлобинских ЭС,
 * в остальных филиалах поле остаётся пустым.
 */
async function sapCodeForLine(lineId, filialId) {
  if (Number(filialId) !== 2 || !lineId) return null;
  const line = await queryOne('SELECT SAP_CODE FROM LINES WHERE ID = ?', [Number(lineId)]);
  return line?.sap_code ?? null;
}

// ── GET /defectCounts — количество дефектов по листам ─────────────────────────────────────────────────────────
router.get('/defectCounts', async (req, res) => {
  try {
    const lf = lineWhereClause(req, 'd.LINE_ID');
    const rows = await query(
      'SELECT d.SHEET_ID,' +
      ' SUM(CASE WHEN d.IS_FIXED = 0 THEN 1 ELSE 0 END) AS ACTIVE,' +
      ' SUM(CASE WHEN d.IS_FIXED = 1 THEN 1 ELSE 0 END) AS FIXED' +
      ' FROM DEFECT_RECORDS d' +
      ' WHERE d.DEFECT_ID != ?' + lf.sql +
      ' GROUP BY d.SHEET_ID',
      [NO_DEFECT_ID, ...lf.params]);

    res.json(rows.map(r => ({
      sheetId: r.sheet_id,
      active:  Number(r.active),
      fixed:   Number(r.fixed),
    })));
  } catch (err) {
    console.error('[ERROR]', req.method, req.path, err.message);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ── GET /defectRecords — список дефектов ────────────────────────────────────────────────────────
router.get('/defectRecords', async (req, res) => {
  try {
    const { sheetId } = req.query;
    const lf = lineWhereClause(req, 'd.LINE_ID');

    let sql = SELECT_DEFECT.replace('FROM DEFECT_RECORDS', 'FROM DEFECT_RECORDS d')
      + ' WHERE d.DEFECT_ID != ?' + lf.sql;
    const params = [...lf.params];

    if (sheetId) { sql += ' AND d.SHEET_ID = ?'; params.push(Number(sheetId)); }
    sql += ' ORDER BY d.POLE_NUMBER';

    const rows = await query(sql, [NO_DEFECT_ID, ...params]);
    res.json(rows.map(toDefect));
  } catch (err) {
    console.error('[ERROR]', req.method, req.path, err.message);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ── POST /defectRecords — создать дефект ───────────────────────────────────────────────────────
router.post('/defectRecords', requirePermission('defects.create'), async (req, res) => {
  try {
    const body = req.body;
    const sheetId = Number(body.sheetId);

    // Проверяем доступ через линию листка
    const sheet = await queryOne(
      'SELECT ID, LINE_ID, FILIAL_ID FROM INSPECTION_SHEETS WHERE ID = ?', [sheetId],
    );
    if (!sheet) return res.status(400).json({ error: 'Sheet not found' });
    if (!canAccessLine(req, sheet.line_id) || !canAccessFilial(req, sheet.filial_id))
      return res.status(403).json({ error: 'Доступ запрещён' });

    const spanRange  = normalizeSpan(body.spanRange);
    if (spanRange && !/^\d+(-\d+)?$/.test(spanRange))
      return res.status(400).json({ error: 'Неверно указаны пролёты (пример: 5 или 3-7)' });
    // Для пролётов опора не используется — это защищает от ложных совпадений с дефектами на опорах
    const poleNumber = spanRange ? 0 : Number(body.poleNumber);
    const phaseId    = body.phaseId ? Number(body.phaseId) : null;
    const customName = normalizeCustomName(body.customName);

    // Дедупликация: листок + место (опора/пролёты) + вид дефекта + фаза + свой текст.
    // SPAN_RANGE обязательно сравниваем: у всех пролётных дефектов POLE_NUMBER = 0,
    // иначе дефект, добавленный в одном пролёте, блокировал бы добавление в другом.
    const dup = await queryOne(
      `SELECT ID FROM DEFECT_RECORDS
       WHERE SHEET_ID = ? AND POLE_NUMBER = ? AND DEFECT_ID = ?
         AND (PHASE_ID = ? OR (PHASE_ID IS NULL AND ? IS NULL))
         AND (SPAN_RANGE = ? OR (SPAN_RANGE IS NULL AND ? IS NULL))
         AND (CUSTOM_NAME = ? OR (CUSTOM_NAME IS NULL AND ? IS NULL))
         AND IS_FIXED = 0 AND (STATUS IS NULL OR STATUS != 'rejected')`,
      [sheetId, poleNumber, Number(body.defectId),
       phaseId, phaseId, spanRange, spanRange, customName, customName],
    );
    if (dup) {
      return res.status(409).json({
        error:    'duplicate',
        message:  'Такой дефект уже существует на этой опоре в данном листке',
        existing: await queryOne(SELECT_DEFECT + ' WHERE ID = ?', [dup.id]).then(r => r && toDefect(r)),
      });
    }

    const id = await nextId('defects');
    const sapCode = await sapCodeForLine(sheet.line_id, sheet.filial_id);
    await execute(
      `INSERT INTO DEFECT_RECORDS
         (ID, SHEET_ID, LINE_ID, POLE_NUMBER, DEFECT_ID, PHASE_ID, ELEMENT_ID,
          DATE_FOUND, INSPECTOR_FIND, IS_FIXED, DATE_FIXED, INSPECTOR_FIX,
          INSULATOR_COUNT, SPAN_RANGE, NOTES, STATUS, CUSTOM_NAME, SAP_CODE)
       VALUES (?,?,?,?,?,?,?,
               CAST(? AS DATE),?,?,CAST(? AS DATE),?,
               ?,?,?,?,?,?)`,
      [id, sheetId, sheet.line_id,
       poleNumber, Number(body.defectId),
       phaseId,
       body.elementId ? Number(body.elementId) : null,
       body.dateFound    ?? null,
       body.inspectorFind ?? null,
       body.isFixed ? 1 : 0,
       body.dateFixed    ?? null,
       body.inspectorFix ?? null,
       body.insulatorCount != null ? Number(body.insulatorCount) : null,
       spanRange,
       body.notes     ?? null,
       body.status    ?? null,
       customName,
       sapCode],
    );

    const row = await queryOne(SELECT_DEFECT + ' WHERE ID = ?', [id]);
    res.status(201).json(toDefect(row));
  } catch (err) {
    console.error('[ERROR]', req.method, req.path, err.message);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ── PATCH /defectRecords/:id — обновить дефект ──────────────────────────────────────────────────
/**
 * Какие права нужны для изменения дефекта — по набору полей:
 *   isFixed (+ дата, кто устранил)                      → defects.fix
 *   заключение мастера (мероприятия, срок, мастер, объём работ,
 *   дата устранения и производитель работ из журнала)  → journal.conclusion
 *   примечание, обнаружил, статус, а также место (опора/пролёты),
 *   вид дефекта, фаза, изоляторы, дата обнаружения     → defects.edit
 */
function requiredForDefectPatch(body) {
  const has = (k) => k in body;
  const need = new Set();
  if (has('isFixed')) need.add('defects.fix');
  if (['masterConclusion', 'resolutionDeadline', 'masterName', 'fixWorkVolume'].some(has)) need.add('journal.conclusion');
  if (!has('isFixed') && ['dateFixed', 'inspectorFix'].some(has)) need.add('journal.conclusion');
  if (['notes', 'inspectorFind', 'status', 'customName', ...CORE_FIELDS].some(has)) need.add('defects.edit');
  return [...need];
}

router.patch('/defectRecords/:id', async (req, res) => {
  try {
    const id   = Number(req.params.id);
    const body = { ...(req.body ?? {}) };
    if ('customName' in body) body.customName = normalizeCustomName(body.customName);
    const missing = requiredForDefectPatch(body).find((k) => !hasPermission(req.role, k, req.filialId));
    if (missing) return res.status(403).json({ error: 'Недостаточно прав для этого действия', permission: missing });

    // Проверяем доступ через линию дефекта
    const existing = await queryOne(
      `SELECT d.ID, d.LINE_ID, d.SHEET_ID, d.POLE_NUMBER, d.SPAN_RANGE, d.DEFECT_ID,
              d.PHASE_ID, d.CUSTOM_NAME, d.IS_FIXED, s.FILIAL_ID
       FROM DEFECT_RECORDS d LEFT JOIN INSPECTION_SHEETS s ON s.ID = d.SHEET_ID WHERE d.ID = ?`, [id],
    );
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (!canAccessLine(req, existing.line_id) || !canAccessFilial(req, existing.filial_id))
      return res.status(403).json({ error: 'Доступ запрещён' });

    // Исправление ошибочно внесённого дефекта: только пока он не устранён
    let core = {};
    if (CORE_FIELDS.some((k) => k in body)) {
      if (existing.is_fixed === 1)
        return res.status(400).json({ error: 'Устранённый дефект изменить нельзя' });
      const checked = await validateCoreFields(body, existing, id);
      if (checked.error) return res.status(checked.status ?? 400).json({ error: checked.error });
      core = checked.values;
    }

    const sets   = [];
    const params = [];

    for (const [jsKey, col] of Object.entries(PATCH_COLS)) {
      if (!(jsKey in body)) continue;
      if (!PATCH_ALLOWED.has(jsKey)) continue;
      const val = jsKey in core ? core[jsKey] : body[jsKey];

      if (DATE_PATCH_COLS.has(jsKey)) {
        sets.push(`${col} = CAST(? AS DATE)`);
        params.push(val ?? null);
      } else if (jsKey === 'isFixed') {
        sets.push(`${col} = ?`);
        params.push(val ? 1 : 0);
      } else {
        sets.push(`${col} = ?`);
        params.push(val ?? null);
      }
    }

    if (sets.length === 0)
      return res.status(400).json({ error: 'Нет разрешённых полей' });

    if (Number(existing.filial_id) === 2) {
      const sapCode = await sapCodeForLine(existing.line_id, existing.filial_id);
      sets.push('SAP_CODE = ?');
      params.push(sapCode);
    }

    params.push(id);
    await execute(`UPDATE DEFECT_RECORDS SET ${sets.join(', ')} WHERE ID = ?`, params);

    const row = await queryOne(SELECT_DEFECT + ' WHERE ID = ?', [id]);
    res.json(toDefect(row));
  } catch (err) {
    console.error('[ERROR]', req.method, req.path, err.message);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ── DELETE /defectRecords/:id — удалить дефект ─────────────────────────────────────────────────
router.delete('/defectRecords/:id', requirePermission('defects.delete'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await queryOne('SELECT d.ID, d.LINE_ID, s.FILIAL_ID FROM DEFECT_RECORDS d LEFT JOIN INSPECTION_SHEETS s ON s.ID = d.SHEET_ID WHERE d.ID = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (!canAccessLine(req, row.line_id) || !canAccessFilial(req, row.filial_id))
      return res.status(403).json({ error: 'Доступ запрещён' });
    await execute('DELETE FROM DEFECT_RECORDS WHERE ID = ?', [id]);
    res.status(200).json({});
  } catch (err) {
    console.error('[ERROR]', req.method, req.path, err.message);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ── DELETE /defectRecordsBySheet/:sheetId — удалить дефекты листа ─────────────────────────────────────
router.delete('/defectRecordsBySheet/:sheetId', requirePermission('defects.delete'), async (req, res) => {
  try {
    const sheetId = Number(req.params.sheetId);
    const sheet   = await queryOne(
      'SELECT ID, LINE_ID, FILIAL_ID FROM INSPECTION_SHEETS WHERE ID = ?', [sheetId],
    );
    if (!sheet) return res.status(200).json({});
    if (!canAccessLine(req, sheet.line_id) || !canAccessFilial(req, sheet.filial_id))
      return res.status(403).json({ error: 'Доступ запрещён' });
    await execute('DELETE FROM DEFECT_RECORDS WHERE SHEET_ID = ?', [sheetId]);
    res.status(200).json({});
  } catch (err) {
    console.error('[ERROR]', req.method, req.path, err.message);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ── GET /defectTrends?lineId=N — тренды дефектов по линии ────────────────────────────────────────────────
router.get('/defectTrends', async (req, res) => {
  try {
    const lineId = req.query.lineId ? Number(req.query.lineId) : null;
    const lf     = lineWhereClause(req, 'd.LINE_ID');

    let sql = `
      SELECT CAST(DATE_FOUND AS VARCHAR(7)) AS MONTH,
             SUM(CASE WHEN IS_FIXED = 0 THEN 1 ELSE 0 END) AS ACTIVE,
             SUM(CASE WHEN IS_FIXED = 1 THEN 1 ELSE 0 END) AS FIXED
      FROM DEFECT_RECORDS d
      WHERE DEFECT_ID != ?
        AND DATE_FOUND IS NOT NULL
        AND DATE_FOUND >= CAST(? AS DATE) ${lf.sql}`;

    // Последние 12 месяцев
    const now      = new Date();
    const cutoff   = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-01`;
    const params   = [NO_DEFECT_ID, cutoffStr, ...lf.params];

    if (lineId) { sql += ' AND d.LINE_ID = ?'; params.push(lineId); }
    sql += ' GROUP BY CAST(DATE_FOUND AS VARCHAR(7)) ORDER BY 1';

    const rows = await query(sql, params);

    // Заполняем все 12 месяцев (включая нулевые)
    const map = {};
    for (let i = 11; i >= 0; i--) {
      const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      map[key]  = { month: key, active: 0, fixed: 0 };
    }
    for (const r of rows) {
      const key = r.month ? String(r.month).slice(0,7) : null;
      if (key && map[key]) {
        map[key].active = Number(r.active);
        map[key].fixed  = Number(r.fixed);
      }
    }
    res.json(Object.values(map));
  } catch (err) {
    console.error('[ERROR]', req.method, req.path, err.message);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// ── GET /poleDefectStatus?lineId=N — статус дефектов по опорам ────────────────────────────────────────────
router.get('/poleDefectStatus', async (req, res) => {
  try {
    const lineId = Number(req.query.lineId);
    if (!lineId) return res.status(400).json({ error: 'lineId required' });
    if (!canAccessLine(req, lineId))
      return res.status(403).json({ error: 'Доступ запрещён' });

    const rows = await query(`
      SELECT POLE_NUMBER,
             SUM(CASE WHEN IS_FIXED = 0 THEN 1 ELSE 0 END) AS ACTIVE,
             SUM(CASE WHEN IS_FIXED = 1 THEN 1 ELSE 0 END) AS FIXED
      FROM DEFECT_RECORDS
      WHERE LINE_ID = ? AND DEFECT_ID != ?
      GROUP BY POLE_NUMBER
    `, [lineId, NO_DEFECT_ID]);

    res.json(rows.map(r => ({
      poleNumber: r.pole_number,
      active:     Number(r.active),
      fixed:      Number(r.fixed),
    })));
  } catch (err) {
    console.error('[ERROR]', req.method, req.path, err.message);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
// Чистые хелперы — экспортируем для юнит-тестов, не меняя экспорт middleware.
module.exports.normalizeSpan = normalizeSpan;
module.exports.normalizeCustomName = normalizeCustomName;
module.exports.requiredForDefectPatch = requiredForDefectPatch;
