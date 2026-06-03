// routes/sheets.js — листки осмотра
const { Router } = require('express');
const { nextId, seedDb } = require('../lib/db');
const { DATA_DIR, iterAllFiles, getLinePath, getLineDb, saveLineDb, findFileBySheetId } = require('../lib/helpers');
const fs = require('fs');
const path = require('path');

const SHEET_FILTER_ALLOWED = new Set(['filialId', 'voltageId', 'lineId', 'createdBy']);
const LISTS_DIR = path.join(DATA_DIR, 'lists');

const router = Router();

// GET /inspectionSheets
router.get('/inspectionSheets', (req, res) => {
  const all = [];
  iterAllFiles((fp) => {
    const db = JSON.parse(fs.readFileSync(fp, 'utf8'));
    (db.inspectionSheets ?? []).forEach((s) => all.push(s));
  });
  all.sort((a, b) => (b.createdDate ?? '').localeCompare(a.createdDate ?? ''));
  const { _sort, _order, ...rawFilters } = req.query;
  const filters = Object.fromEntries(Object.entries(rawFilters).filter(([k]) => SHEET_FILTER_ALLOWED.has(k)));
  let result = all;
  for (const [key, val] of Object.entries(filters)) {
    result = result.filter((s) => String(s[key]) === String(val));
  }
  res.json(result);
});

// GET /inspectionSheets/:id
router.get('/inspectionSheets/:id', (req, res) => {
  const id = Number(req.params.id);
  let found = null;
  iterAllFiles((fp) => {
    if (found) return;
    const db = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const sheet = (db.inspectionSheets ?? []).find((s) => s.id === id);
    if (sheet) found = sheet;
  });
  if (found) return res.json(found);
  res.status(404).json({ error: 'Not found' });
});

// POST /inspectionSheets
router.post('/inspectionSheets', (req, res) => {
  const body = req.body;
  const { filialId, voltageId, lineId, createdDate } = body;
  if (!filialId || !voltageId || !lineId || !createdDate)
    return res.status(400).json({ error: 'Отсутствуют обязательные поля' });
  const filepath = getLinePath(filialId, voltageId, lineId, createdDate, seedDb);
  if (!filepath) return res.status(400).json({ error: 'Линия не найдена' });
  const data = getLineDb(filepath);
  const duplicate = (data.inspectionSheets ?? []).find((s) => s.createdDate === createdDate);
  if (duplicate)
    return res.status(409).json({ error: 'Листок осмотра на эту дату уже существует', existing: duplicate });
  const newId = nextId('inspectionSheets');
  const newSheet = { ...body, id: newId };
  data.inspectionSheets = [...(data.inspectionSheets ?? []), newSheet];
  saveLineDb(filepath, data);
  res.status(201).json(newSheet);
});

// POST /inspectionSheets/:id/clone
router.post('/inspectionSheets/:id/clone', (req, res) => {
  const id = Number(req.params.id);
  const { newDate } = req.body;
  if (!newDate) return res.status(400).json({ error: 'newDate обязателен (YYYY-MM-DD)' });
  const fp = findFileBySheetId(id);
  if (!fp) return res.status(404).json({ error: 'Листок не найден' });
  const data = getLineDb(fp);
  const orig = (data.inspectionSheets ?? []).find((s) => s.id === id);
  if (!orig) return res.status(404).json({ error: 'Листок не найден в файле' });
  const dup = (data.inspectionSheets ?? []).find((s) => s.createdDate === newDate);
  if (dup) return res.status(409).json({ error: `Листок на ${newDate} уже существует`, existing: dup });
  const newId = nextId('inspectionSheets');
  const newSheet = {
    ...orig,
    id: newId,
    createdDate: newDate,
    status: 'active',
    notes: orig.notes ? `Копия от ${orig.createdDate}. ${orig.notes}` : `Копия от ${orig.createdDate}`,
  };
  data.inspectionSheets.push(newSheet);
  saveLineDb(fp, data);
  res.status(201).json(newSheet);
});

// DELETE /inspectionSheets/:id
router.delete('/inspectionSheets/:id', (req, res) => {
  const id = Number(req.params.id);
  const fp = findFileBySheetId(id);
  if (!fp) return res.status(404).json({ error: 'Not found' });
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const idx = (data.inspectionSheets ?? []).findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.inspectionSheets.splice(idx, 1);
  data.defectRecords = (data.defectRecords ?? []).filter((r) => r.sheetId !== id);
  if (data.inspectionSheets.length === 0) {
    fs.unlinkSync(fp);
    // Удаляем пустые папки вверх до lists/
    const tryRemoveDir = (dir) => {
      try {
        if (dir === LISTS_DIR) return;
        if (fs.readdirSync(dir).length === 0) {
          fs.rmdirSync(dir);
          tryRemoveDir(path.dirname(dir));
        }
      } catch {}
    };
    tryRemoveDir(path.dirname(fp));
  } else {
    saveLineDb(fp, data);
  }
  res.status(200).json({ id });
});

module.exports = router;
