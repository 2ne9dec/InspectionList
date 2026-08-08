'use strict';

/**
 * routes/reference.js -- справочники (Firebird).
 *
 * GET  /filials
 * GET  /voltages
 * GET  /lines
 * PATCH /lines/:id
 * GET  /elements
 * GET  /defectTypes
 * GET  /phases
 * GET  /phaseElementIds
 * GET  /filialVoltageFilter
 */

const { Router } = require('express');
const { query, execute, queryOne } = require('../lib/fbDb');
const { canAccessLine } = require('../lib/tenancy');

const router = Router();

// ── Вспомогательные ───────────────────────────────────────────────────────────

const SHEET_SELECT = `
  SELECT ID, FILIAL_ID, VOLTAGE_ID, LINE_ID, CREATED_BY,
        CAST(CREATED_DATE AS VARCHAR(10)) AS CREATED_DATE,
        STATUS, NOTES
  FROM INSPECTION_SHEETS`;

// ── GET /filials ──────────────────────────────────────────────────────────────
router.get('/filials', async (req, res) => {
  try {
    const rows = await query('SELECT ID, NAME FROM FILIALS ORDER BY ID');
    const data = rows.map(r => ({ id: r.id, name: r.name }));
    if (req.isAdmin || req.filialId == null) return res.json(data);
    res.json(data.filter(f => f.id === req.filialId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /voltages ─────────────────────────────────────────────────────────────
router.get('/voltages', async (req, res) => {
  try {
    const rows = await query('SELECT ID, NAME, FILIAL_ID FROM VOLTAGES ORDER BY ID');
    const data = rows.map(r => ({ id: r.id, name: r.name, filialId: r.filial_id }));
    if (req.isAdmin || req.filialId == null) return res.json(data);
    res.json(data.filter(v => v.filialId === req.filialId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /lines ────────────────────────────────────────────────────────────────
router.get('/lines', async (req, res) => {
  try {
    const rows = await query(`
      SELECT ID, NAME, VOLTAGE_ID, FILIAL_ID, POLE_RANGE,
            POLE_START, POLE_END, POLE_COUNT,
            YEAR_BUILT, YEAR_LAST_OVERHAUL, LENGTH_KM,
            POLE_TYPE, WIRE_TYPE, NOTES, SAP_CODE
      FROM LINES ORDER BY ID
    `);
    const data = rows.map(toLine);
    if (req.isAdmin || !req.allowedLineIds) return res.json(data);
    res.json(data.filter(l => req.allowedLineIds.has(l.id)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /lines/:id ──────────────────────────────────────────────────────────
const EDITABLE_LINE_COLS = {
  yearBuilt:          'YEAR_BUILT',
  yearLastOverhaul:   'YEAR_LAST_OVERHAUL',
  poleType:           'POLE_TYPE',
  wireType:           'WIRE_TYPE',
  notes:              'NOTES',
  lengthKm:           'LENGTH_KM',
  poleCount:          'POLE_COUNT',
};

router.patch('/lines/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!canAccessLine(req, id))
      return res.status(403).json({ error: 'Доступ запрещён' });

    const sets = [];
    const params = [];
    for (const [jsKey, col] of Object.entries(EDITABLE_LINE_COLS)) {
      if (jsKey in req.body) {
        sets.push(`${col} = ?`);
        params.push(req.body[jsKey]);
      }
    }
    if (sets.length === 0)
      return res.status(400).json({ error: 'Нет полей для обновления' });

    params.push(id);
    await execute(`UPDATE LINES SET ${sets.join(', ')} WHERE ID = ?`, params);

    const row = await queryOne(`
      SELECT ID, NAME, VOLTAGE_ID, FILIAL_ID, POLE_RANGE,
            POLE_START, POLE_END, POLE_COUNT,
            YEAR_BUILT, YEAR_LAST_OVERHAUL, LENGTH_KM,
            POLE_TYPE, WIRE_TYPE, NOTES, SAP_CODE
      FROM LINES WHERE ID = ?`, [id]);
    res.json(row ? toLine(row) : { id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /elements ─────────────────────────────────────────────────────────────
router.get('/elements', async (req, res) => {
  try {
    const rows = await query('SELECT ID, NAME FROM ELEMENTS ORDER BY ID');
    res.json(rows.map(r => ({ id: r.id, name: r.name })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /defectTypes ──────────────────────────────────────────────────────────
router.get('/defectTypes', async (req, res) => {
  try {
    const rows = await query(
      'SELECT ID, NAME, SEVERITY, ELEMENT_ID FROM DEFECT_TYPES ORDER BY ID',
    );
    res.json(rows.map(r => ({
      id:        r.id,
      name:      r.name,
      severity:  r.severity,
      elementId: r.element_id,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /phases ───────────────────────────────────────────────────────────────
router.get('/phases', async (req, res) => {
  try {
    const rows = await query('SELECT ID, NAME FROM PHASES ORDER BY ID');
    res.json(rows.map(r => ({ id: r.id, name: r.name })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /phaseElementIds ──────────────────────────────────────────────────────
router.get('/phaseElementIds', async (req, res) => {
  try {
    const rows = await query(
      'SELECT PHASE_ID, ELEMENT_ID FROM PHASE_ELEMENT_IDS',
    );
    res.json(rows.map(r => ({ phaseId: r.phase_id, elementId: r.element_id })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /filialVoltageFilter ──────────────────────────────────────────────────
router.get('/filialVoltageFilter', async (req, res) => {
  try {
    const rows = await query(
      'SELECT FILIAL_ID, VOLTAGE_ID FROM FILIAL_VOLTAGE_FILTER',
    );
    // Формат: { "2": [1, 2, 4] }
    const result = {};
    for (const r of rows) {
      const fid = String(r.filial_id);
      if (!result[fid]) result[fid] = [];
      result[fid].push(r.voltage_id);
    }
    if (req.isAdmin || req.filialId == null) return res.json(result);
    const fid = String(req.filialId);
    res.json(fid in result ? { [fid]: result[fid] } : {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Маппер ────────────────────────────────────────────────────────────────────
function toLine(r) {
  return {
    id:               r.id,
    name:             r.name,
    voltageId:        r.voltage_id,
    filialId:         r.filial_id,
    poleRange:        r.pole_range    ?? null,
    poleStart:        r.pole_start    ?? null,
    poleEnd:          r.pole_end      ?? null,
    poleCount:        r.pole_count    ?? null,
    yearBuilt:        r.year_built    ?? null,
    yearLastOverhaul: r.year_last_overhaul ?? null,
    lengthKm:         r.length_km     != null ? Number(r.length_km) : null,
    poleType:         r.pole_type     ?? null,
    wireType:         r.wire_type     ?? null,
    notes:            r.notes         ?? null,
    sapCode:          r.sap_code      ?? null,
  };
}

module.exports = router;
