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
const { canAccessLine, lineWhereClause } = require('../lib/tenancy');

const NO_DEFECT_ID = 117; // маркер «дефекты отсутствуют» — не считается дефектом

const PATCH_ALLOWED = new Set([
  'isFixed', 'dateFixed', 'inspectorFix', 'inspectorFind', 'notes', 'status',
  'masterConclusion', 'resolutionDeadline', 'masterName', 'fixWorkVolume',
]);

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
};

const DATE_PATCH_COLS = new Set(['dateFixed', 'resolutionDeadline']);

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
         MASTER_NAME, FIX_WORK_VOLUME
  FROM DEFECT_RECORDS`;

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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

// ── POST /defectRecords — создать дефект ───────────────────────────────────────────────────────
router.post('/defectRecords', async (req, res) => {
  try {
    const body = req.body;
    const sheetId = Number(body.sheetId);

    // Проверяем доступ через линию листка
    const sheet = await queryOne(
      'SELECT ID, LINE_ID FROM INSPECTION_SHEETS WHERE ID = ?', [sheetId],
    );
    if (!sheet) return res.status(400).json({ error: 'Sheet not found' });
    if (!canAccessLine(req, sheet.line_id))
      return res.status(403).json({ error: 'Доступ запрещён' });

    // Дедупликация: sheetId + poleNumber + defectId + phaseId
    const dup = await queryOne(
      `SELECT ID FROM DEFECT_RECORDS
       WHERE SHEET_ID = ? AND POLE_NUMBER = ? AND DEFECT_ID = ?
         AND (PHASE_ID = ? OR (PHASE_ID IS NULL AND ? IS NULL))
         AND IS_FIXED = 0 AND (STATUS IS NULL OR STATUS != 'rejected')`,
      [sheetId, Number(body.poleNumber), Number(body.defectId),
       body.phaseId ? Number(body.phaseId) : null,
       body.phaseId ? Number(body.phaseId) : null],
    );
    if (dup) {
      return res.status(409).json({
        error:    'duplicate',
        message:  'Такой дефект уже существует на этой опоре в данном листке',
        existing: await queryOne(SELECT_DEFECT + ' WHERE ID = ?', [dup.id]).then(r => r && toDefect(r)),
      });
    }

    const id = await nextId('defects');
    await execute(
      `INSERT INTO DEFECT_RECORDS
         (ID, SHEET_ID, LINE_ID, POLE_NUMBER, DEFECT_ID, PHASE_ID, ELEMENT_ID,
          DATE_FOUND, INSPECTOR_FIND, IS_FIXED, DATE_FIXED, INSPECTOR_FIX,
          INSULATOR_COUNT, SPAN_RANGE, NOTES, STATUS)
       VALUES (?,?,?,?,?,?,?,
               CAST(? AS DATE),?,?,CAST(? AS DATE),?,
               ?,?,?,?)`,
      [id, sheetId, sheet.line_id,
       Number(body.poleNumber), Number(body.defectId),
       body.phaseId   ? Number(body.phaseId)   : null,
       body.elementId ? Number(body.elementId) : null,
       body.dateFound    ?? null,
       body.inspectorFind ?? null,
       body.isFixed ? 1 : 0,
       body.dateFixed    ?? null,
       body.inspectorFix ?? null,
       body.insulatorCount != null ? Number(body.insulatorCount) : null,
       body.spanRange ?? null,
       body.notes     ?? null,
       body.status    ?? null],
    );

    const row = await queryOne(SELECT_DEFECT + ' WHERE ID = ?', [id]);
    res.status(201).json(toDefect(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /defectRecords/:id — обновить дефект ──────────────────────────────────────────────────
router.patch('/defectRecords/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    // Проверяем доступ через линию дефекта
    const existing = await queryOne(
      'SELECT ID, LINE_ID FROM DEFECT_RECORDS WHERE ID = ?', [id],
    );
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (!canAccessLine(req, existing.line_id))
      return res.status(403).json({ error: 'Доступ запрещён' });

    const sets   = [];
    const params = [];

    for (const [jsKey, col] of Object.entries(PATCH_COLS)) {
      if (!(jsKey in req.body)) continue;
      if (!PATCH_ALLOWED.has(jsKey)) continue;
      const val = req.body[jsKey];

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

    params.push(id);
    await execute(`UPDATE DEFECT_RECORDS SET ${sets.join(', ')} WHERE ID = ?`, params);

    const row = await queryOne(SELECT_DEFECT + ' WHERE ID = ?', [id]);
    res.json(toDefect(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /defectRecords/:id — удалить дефект ─────────────────────────────────────────────────
router.delete('/defectRecords/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const row = await queryOne('SELECT ID, LINE_ID FROM DEFECT_RECORDS WHERE ID = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (!canAccessLine(req, row.line_id))
      return res.status(403).json({ error: 'Доступ запрещён' });
    await execute('DELETE FROM DEFECT_RECORDS WHERE ID = ?', [id]);
    res.status(200).json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /defectRecordsBySheet/:sheetId — удалить дефекты листа ─────────────────────────────────────
router.delete('/defectRecordsBySheet/:sheetId', async (req, res) => {
  try {
    const sheetId = Number(req.params.sheetId);
    const sheet   = await queryOne(
      'SELECT ID, LINE_ID FROM INSPECTION_SHEETS WHERE ID = ?', [sheetId],
    );
    if (!sheet) return res.status(200).json({});
    if (!canAccessLine(req, sheet.line_id))
      return res.status(403).json({ error: 'Доступ запрещён' });
    await execute('DELETE FROM DEFECT_RECORDS WHERE SHEET_ID = ?', [sheetId]);
    res.status(200).json({});
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
