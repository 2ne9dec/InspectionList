const NO_DEFECT_ID = 117; // «Дефекты отсутствуют»

// routes/defects.js — записи о дефектах
const { Router } = require('express');
const { nextId } = require('../lib/db');
const { iterAllFiles, findFileBySheetId, getLineDb, saveLineDb } = require('../lib/helpers');
const fs = require('fs');

const DEFECT_PATCH_ALLOWED = new Set(['isFixed', 'dateFixed', 'inspectorFix', 'notes', 'status']);

const router = Router();

// GET /defectCounts — сводка active/fixed по sheetId
router.get('/defectCounts', (req, res) => {
  const counts = new Map();
  iterAllFiles((fp) => {
    const db = JSON.parse(fs.readFileSync(fp, 'utf8'));
    (db.defectRecords ?? [])
      .filter((r) => r.defectId !== NO_DEFECT_ID)
      .forEach((r) => {
        const cur = counts.get(r.sheetId) ?? { sheetId: r.sheetId, active: 0, fixed: 0 };
        if (r.isFixed) cur.fixed += 1;
        else cur.active += 1;
        counts.set(r.sheetId, cur);
      });
  });
  res.json(Array.from(counts.values()));
});

// GET /defectRecords?sheetId=N
router.get('/defectRecords', (req, res) => {
  const { sheetId } = req.query;
  const all = [];
  iterAllFiles((fp) => {
    const db = JSON.parse(fs.readFileSync(fp, 'utf8'));
    (db.defectRecords ?? []).forEach((r) => all.push(r));
  });
  let result = sheetId ? all.filter((r) => String(r.sheetId) === String(sheetId)) : all;
  // Сортировка: опоры по номеру, Пролётыы после опор (poleNumber может быть null)
  result.sort((a, b) => {
    const pa = a.poleNumber ?? Infinity;
    const pb = b.poleNumber ?? Infinity;
    return pa - pb;
  });
  res.json(result);
});

// POST /defectRecords
router.post('/defectRecords', (req, res) => {
  const body = req.body;
  const fp = findFileBySheetId(Number(body.sheetId));
  if (!fp) return res.status(400).json({ error: 'Sheet not found' });
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));

  // Дедупликация: sheetId + (poleNumber или spanRange) + defectId + phaseId + insulatorCount
  const duplicate = (data.defectRecords ?? []).find(
    (r) =>
      r.sheetId === Number(body.sheetId) &&
      (r.poleNumber ?? null) === (body.poleNumber != null ? Number(body.poleNumber) : null) &&
      (r.spanRange ?? null) === (body.spanRange ?? null) &&
      r.defectId === Number(body.defectId) &&
      (r.phaseId ?? null) === (body.phaseId ? Number(body.phaseId) : null) &&
      (r.insulatorCount ?? null) === (body.insulatorCount != null ? Number(body.insulatorCount) : null) &&
      !r.isFixed &&
      r.status !== 'rejected',
  );
  if (duplicate) {
    return res.status(409).json({
      error: 'duplicate',
      message: 'Такой дефект уже существует на этой опоре/Пролётые в данном листке',
      existing: duplicate,
    });
  }

  const newId = nextId('defectRecords');
  const newRecord = { ...body, id: newId };
  data.defectRecords = [...(data.defectRecords ?? []), newRecord];
  saveLineDb(fp, data);
  res.status(201).json(newRecord);
});

// PATCH /defectRecords/:id
router.patch('/defectRecords/:id', (req, res) => {
  const id = Number(req.params.id);
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => DEFECT_PATCH_ALLOWED.has(k)));
  if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Нет разрешённых полей' });
  let found = null;
  iterAllFiles((fp) => {
    if (found) return;
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const idx = (data.defectRecords ?? []).findIndex((r) => r.id === id);
    if (idx !== -1) {
      data.defectRecords[idx] = { ...data.defectRecords[idx], ...patch };
      saveLineDb(fp, data);
      found = data.defectRecords[idx];
    }
  });
  if (found) return res.json(found);
  res.status(404).json({ error: 'Not found' });
});

// DELETE /defectRecords/:id
router.delete('/defectRecords/:id', (req, res) => {
  const id = Number(req.params.id);
  let deleted = false;
  iterAllFiles((fp) => {
    if (deleted) return;
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const idx = (data.defectRecords ?? []).findIndex((r) => r.id === id);
    if (idx !== -1) {
      data.defectRecords.splice(idx, 1);
      saveLineDb(fp, data);
      deleted = true;
    }
  });
  if (deleted) return res.status(200).json({});
  res.status(404).json({ error: 'Not found' });
});

// DELETE /defectRecordsBySheet/:sheetId
router.delete('/defectRecordsBySheet/:sheetId', (req, res) => {
  const sheetId = Number(req.params.sheetId);
  const fp = findFileBySheetId(sheetId);
  if (!fp) return res.status(200).json({});
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  data.defectRecords = (data.defectRecords ?? []).filter((r) => r.sheetId !== sheetId);
  saveLineDb(fp, data);
  res.status(200).json({});
});

module.exports = router;
