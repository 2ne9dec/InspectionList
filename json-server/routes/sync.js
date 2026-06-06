// routes/sync.js — batch synchronization endpoint
// POST /sync/batch  { sheets: InspectionSheet[], defectRecords: DefectRecord[] }
const { Router } = require('express');
const { seedDb } = require('../lib/db');
const { getLinePath, getLineDb, saveLineDb } = require('../lib/helpers');

const router = Router();

router.post('/sync/batch', (req, res) => {
  const { sheets = [], defectRecords = [] } = req.body;

  let sheetsUpserted  = 0;
  let defectsUpserted = 0;
  const errors = [];

  // ── Листки осмотра ──────────────────────────────────────────────────────
  for (const sheet of sheets) {
    try {
      const { filialId, voltageId, lineId, createdDate } = sheet;
      if (!filialId || !voltageId || !lineId || !createdDate) {
        errors.push({ type: 'sheet', id: sheet.id, reason: 'missing required fields' });
        continue;
      }
      const filepath = getLinePath(filialId, voltageId, lineId, createdDate, seedDb);
      const db = getLineDb(filepath);
      const idx = (db.inspectionSheets ?? []).findIndex((s) => s.id === sheet.id);
      if (idx >= 0) {
        db.inspectionSheets[idx] = sheet; // update
      } else {
        db.inspectionSheets = [...(db.inspectionSheets ?? []), sheet]; // insert
      }
      saveLineDb(filepath, db);
      sheetsUpserted++;
    } catch (e) {
      errors.push({ type: 'sheet', id: sheet.id, reason: String(e.message) });
    }
  }

  // ── Дефекты ─────────────────────────────────────────────────────────────
  // Index sheets by id so we can find the file for each defect
  const sheetIndex = {};
  for (const sheet of sheets) {
    sheetIndex[sheet.id] = sheet;
  }

  for (const defect of defectRecords) {
    try {
      const sheet = sheetIndex[defect.sheetId];
      if (!sheet) {
        errors.push({ type: 'defect', id: defect.id, reason: 'parent sheet not in payload' });
        continue;
      }
      const filepath = getLinePath(
        sheet.filialId, sheet.voltageId, sheet.lineId, sheet.createdDate, seedDb,
      );
      const db = getLineDb(filepath);
      const idx = (db.defectRecords ?? []).findIndex((d) => d.id === defect.id);
      if (idx >= 0) {
        db.defectRecords[idx] = defect;
      } else {
        db.defectRecords = [...(db.defectRecords ?? []), defect];
      }
      saveLineDb(filepath, db);
      defectsUpserted++;
    } catch (e) {
      errors.push({ type: 'defect', id: defect.id, reason: String(e.message) });
    }
  }

  res.json({
    ok: errors.length === 0,
    sheetsUpserted,
    defectsUpserted,
    errors,
  });
});

module.exports = router;
