// routes/reference.js — статические справочники
const { Router } = require('express');
const { seedDb } = require('../lib/db');
const { canAccessLine } = require('../lib/tenancy');

const router = Router();

const path = require('path');
const fs   = require('fs');

// Коллекции, которые отдаются без фильтрации (глобальные справочники)
const GLOBAL_COLS = ['elements', 'defectTypes', 'phases', 'phaseElementIds'];

GLOBAL_COLS.forEach((col) => {
  router.get(`/${col}`, (req, res) => {
    res.json(seedDb[col] ?? []);
  });
});

// GET /filials — не-администратор видит только свой филиал
router.get('/filials', (req, res) => {
  const all = seedDb.filials ?? [];
  if (req.isAdmin || req.filialId == null) return res.json(all);
  res.json(all.filter((f) => f.id === req.filialId));
});

// GET /voltages — не-администратор видит только напряжения своего филиала
router.get('/voltages', (req, res) => {
  const all = seedDb.voltages ?? [];
  if (req.isAdmin || req.filialId == null) return res.json(all);
  res.json(all.filter((v) => v.filialId === req.filialId));
});

// GET /lines — не-администратор видит только линии своего филиала
router.get('/lines', (req, res) => {
  const all = seedDb.lines ?? [];
  if (req.isAdmin || !req.allowedLineIds) return res.json(all);
  res.json(all.filter((l) => req.allowedLineIds.has(l.id)));
});

// GET /filialVoltageFilter — не-администратор видит только свою запись
router.get('/filialVoltageFilter', (req, res) => {
  const raw = seedDb.filialVoltageFilter ?? {};
  if (req.isAdmin || req.filialId == null) return res.json(raw);

  // Поддерживаем оба формата: массив [{filialId, voltageId}] и объект
  if (Array.isArray(raw)) {
    return res.json(raw.filter((fv) => fv.filialId === req.filialId));
  }
  const fid = String(req.filialId);
  return res.json(fid in raw ? { [fid]: raw[fid] } : {});
});

// PATCH /lines/:id — редактирование разрешено только для своих линий
const EDITABLE_LINE_FIELDS = ['yearBuilt', 'yearLastOverhaul', 'poleType', 'wireType', 'notes', 'lengthKm', 'poleCount'];

router.patch('/lines/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!canAccessLine(req, id)) return res.status(403).json({ error: 'Доступ запрещён' });

  const lines = seedDb.lines ?? [];
  const idx   = lines.findIndex((l) => l.id === id);
  if (idx < 0) return res.status(404).json({ error: 'Line not found' });

  const body = req.body ?? {};
  const updates = {};
  for (const field of EDITABLE_LINE_FIELDS) {
    if (field in body) updates[field] = body[field];
  }

  lines[idx] = { ...lines[idx], ...updates };
  seedDb.lines = lines;

  const linesPath = path.join(__dirname, '../seed/lines.json');
  fs.writeFileSync(linesPath, JSON.stringify(lines, null, 2), 'utf8');

  res.json(lines[idx]);
});

module.exports = router;
