'use strict';

/**
 * routes/sync.js -- пакетная синхронизация (Firebird).
 * POST /sync/batch  { sheets: [], defectRecords: [] }
 * GET  /sync/pull   -- возвращает все листки филиала
 */

const { Router }  = require('express');
const { query, execute, queryOne, nextId } = require('../lib/fbDb');

const router = Router();

router.post('/sync/batch', async (req, res) => {
  const { sheets = [], defectRecords = [] } = req.body;
  let sheetsUpserted  = 0;
  let defectsUpserted = 0;
  const errors = [];

  // ── Листки осмотра ──────────────────────────────────────────────────────────
  const sheetMap = {}; // id -> sheet (для поиска при вставке дефектов)

  for (const sheet of sheets) {
    try {
      const { id, filialId, voltageId, lineId, createdDate, createdBy, status, notes } = sheet;
      if (!filialId || !voltageId || !lineId || !createdDate) {
        errors.push({ type: 'sheet', id, reason: 'missing required fields' });
        continue;
      }

      const existing = await queryOne('SELECT ID FROM INSPECTION_SHEETS WHERE ID = ?', [Number(id)]);

      if (existing) {
        await execute(
          `UPDATE INSPECTION_SHEETS
           SET FILIAL_ID=?, VOLTAGE_ID=?, LINE_ID=?, CREATED_BY=?,
               CREATED_DATE=CAST(? AS DATE), STATUS=?, NOTES=?
           WHERE ID=?`,
          [Number(filialId), Number(voltageId), Number(lineId),
           createdBy ?? null, createdDate, status ?? 'active', notes ?? null, Number(id)],
        );
      } else {
        await execute(
          `INSERT INTO INSPECTION_SHEETS
             (ID, FILIAL_ID, VOLTAGE_ID, LINE_ID, CREATED_BY, CREATED_DATE, STATUS, NOTES)
           VALUES (?,?,?,?,?,CAST(? AS DATE),?,?)`,
          [Number(id), Number(filialId), Number(voltageId), Number(lineId),
           createdBy ?? null, createdDate, status ?? 'active', notes ?? null],
        );
      }

      sheetMap[id] = sheet;
      sheetsUpserted++;
    } catch (e) {
      errors.push({ type: 'sheet', id: sheet.id, reason: e.message });
    }
  }

  // ── Дефекты ─────────────────────────────────────────────────────────────────
  for (const defect of defectRecords) {
    try {
      const parent = sheetMap[defect.sheetId];
      if (!parent) {
        errors.push({ type: 'defect', id: defect.id, reason: 'parent sheet not in payload' });
        continue;
      }

      const existing = await queryOne('SELECT ID FROM DEFECT_RECORDS WHERE ID = ?', [Number(defect.id)]);

      if (existing) {
        await execute(
          `UPDATE DEFECT_RECORDS
           SET SHEET_ID=?, LINE_ID=?, POLE_NUMBER=?, DEFECT_ID=?, PHASE_ID=?, ELEMENT_ID=?,
               DATE_FOUND=CAST(? AS DATE), INSPECTOR_FIND=?, IS_FIXED=?,
               DATE_FIXED=CAST(? AS DATE), INSPECTOR_FIX=?,
               INSULATOR_COUNT=?, SPAN_RANGE=?, NOTES=?, STATUS=?,
               MASTER_CONCLUSION=?, RESOLUTION_DEADLINE=CAST(? AS DATE),
               MASTER_NAME=?, FIX_WORK_VOLUME=?
           WHERE ID=?`,
          [Number(defect.sheetId), Number(parent.lineId),
           defect.poleNumber, defect.defectId,
           defect.phaseId   ?? null, defect.elementId ?? null,
           defect.dateFound ?? null, defect.inspectorFind ?? null,
           defect.isFixed ? 1 : 0,
           defect.dateFixed ?? null, defect.inspectorFix ?? null,
           defect.insulatorCount ?? null, defect.spanRange ?? null,
           defect.notes ?? null, defect.status ?? null,
           defect.masterConclusion ?? null,
           defect.resolutionDeadline ?? null,
           defect.masterName ?? null, defect.fixWorkVolume ?? null,
           Number(defect.id)],
        );
      } else {
        await execute(
          `INSERT INTO DEFECT_RECORDS
             (ID, SHEET_ID, LINE_ID, POLE_NUMBER, DEFECT_ID, PHASE_ID, ELEMENT_ID,
              DATE_FOUND, INSPECTOR_FIND, IS_FIXED, DATE_FIXED, INSPECTOR_FIX,
              INSULATOR_COUNT, SPAN_RANGE, NOTES, STATUS,
              MASTER_CONCLUSION, RESOLUTION_DEADLINE, MASTER_NAME, FIX_WORK_VOLUME)
           VALUES (?,?,?,?,?,?,?,
                   CAST(? AS DATE),?,?,CAST(? AS DATE),?,
                   ?,?,?,?,
                   ?,CAST(? AS DATE),?,?)`,
          [Number(defect.id), Number(defect.sheetId), Number(parent.lineId),
           defect.poleNumber, defect.defectId,
           defect.phaseId   ?? null, defect.elementId ?? null,
           defect.dateFound ?? null, defect.inspectorFind ?? null,
           defect.isFixed ? 1 : 0,
           defect.dateFixed ?? null, defect.inspectorFix ?? null,
           defect.insulatorCount ?? null, defect.spanRange ?? null,
           defect.notes ?? null, defect.status ?? null,
           defect.masterConclusion ?? null,
           defect.resolutionDeadline ?? null,
           defect.masterName ?? null, defect.fixWorkVolume ?? null],
        );
      }

      defectsUpserted++;
    } catch (e) {
      errors.push({ type: 'defect', id: defect.id, reason: e.message });
    }
  }

  // Process deletes (defects first due to FK)
  const { deletedDefectIds = [], deletedSheetIds = [] } = req.body;
  for (const id of deletedDefectIds) {
    try { await execute('DELETE FROM DEFECT_RECORDS WHERE ID = ?', [Number(id)]); }
    catch (e) { errors.push({ type: 'defect_delete', id, reason: e.message }); }
  }
  for (const id of deletedSheetIds) {
    try { await execute('DELETE FROM INSPECTION_SHEETS WHERE ID = ?', [Number(id)]); }
    catch (e) { errors.push({ type: 'sheet_delete', id, reason: e.message }); }
  }

  res.json({ ok: errors.length === 0, sheetsUpserted, defectsUpserted, errors });
});


// Pull: return all data for filial to client
router.get('/sync/pull', async (req, res) => {
  const filialId = req.filialId;
  if (!filialId) return res.status(403).json({ error: 'No filial' });

  function fmt(d) {
    if (!d) return null;
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    return String(d).slice(0, 10);
  }

  try {
  const rawSheets = await query(
    'SELECT ID, FILIAL_ID, VOLTAGE_ID, LINE_ID, CREATED_BY, CREATED_DATE, STATUS, NOTES FROM INSPECTION_SHEETS WHERE FILIAL_ID = ?',
    [filialId],
  );

  const rawDefects = rawSheets.length === 0 ? [] : await query(
    'SELECT dr.ID, dr.SHEET_ID, dr.POLE_NUMBER, dr.DEFECT_ID, dr.PHASE_ID, dr.ELEMENT_ID, dr.DATE_FOUND, dr.INSPECTOR_FIND, dr.IS_FIXED, dr.DATE_FIXED, dr.INSPECTOR_FIX, dr.INSULATOR_COUNT, dr.SPAN_RANGE, dr.NOTES, dr.STATUS, dr.MASTER_CONCLUSION, dr.RESOLUTION_DEADLINE, dr.MASTER_NAME, dr.FIX_WORK_VOLUME FROM DEFECT_RECORDS dr WHERE EXISTS (SELECT 1 FROM INSPECTION_SHEETS s WHERE s.ID = dr.SHEET_ID AND s.FILIAL_ID = ?)',
    [filialId],
  );

  const sheets = rawSheets.map(s => ({
    id:          s.id,
    filialId:    s.filial_id,
    voltageId:   s.voltage_id,
    lineId:      s.line_id,
    createdBy:   s.created_by   != null ? s.created_by   : null,
    createdDate: fmt(s.created_date),
    status:      s.status       != null ? s.status       : 'active',
    notes:       s.notes        != null ? s.notes        : null,
  }));

  const defectRecords = rawDefects.map(d => ({
    id:                 d.id,
    sheetId:            d.sheet_id,
    poleNumber:         d.pole_number,
    defectId:           d.defect_id,
    phaseId:            d.phase_id            != null ? d.phase_id            : null,
    elementId:          d.element_id          != null ? d.element_id          : null,
    dateFound:          fmt(d.date_found),
    inspectorFind:      d.inspector_find      != null ? d.inspector_find      : null,
    isFixed:            d.is_fixed === 1,
    dateFixed:          fmt(d.date_fixed),
    inspectorFix:       d.inspector_fix       != null ? d.inspector_fix       : null,
    insulatorCount:     d.insulator_count     != null ? d.insulator_count     : null,
    spanRange:          d.span_range          != null ? d.span_range          : null,
    notes:              d.notes               != null ? d.notes               : null,
    status:             d.status              != null ? d.status              : null,
    masterConclusion:   d.master_conclusion   != null ? d.master_conclusion   : null,
    resolutionDeadline: fmt(d.resolution_deadline),
    masterName:         d.master_name         != null ? d.master_name         : null,
    fixWorkVolume:      d.fix_work_volume     != null ? d.fix_work_volume     : null,
  }));

  res.setHeader('Cache-Control', 'no-store');
  res.json({ sheets, defectRecords });
  } catch (err) {
    console.error('[sync/pull]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
