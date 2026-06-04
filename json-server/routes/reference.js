// routes/reference.js — статические справочники
const { Router } = require('express');
const { seedDb } = require('../lib/db');

const router = Router();

const STATIC_COLS = [
  'filials',
  'voltages',
  'lines',
  'elements',
  'defectTypes',
  'phases',
  'phaseElementIds',
  'garlandElementIds',
  'voltageGarlandCount',
  'filialVoltageFilter',
];

STATIC_COLS.forEach((col) => {
  router.get(`/${col}`, (req, res) => {
    const isObject = col === 'filialVoltageFilter' || col === 'voltageGarlandCount';
  res.json(seedDb[col] ?? (isObject ? {} : []));
  });
});


const path = require('path');
const fs   = require('fs');

const EDITABLE_LINE_FIELDS = ['year_built', 'year_last_overhaul', 'pole_type', 'wire_type', 'notes', 'length_km', 'pole_count'];

router.patch('/lines/:id', (req, res) => {
  const id = Number(req.params.id);
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

  // Persist to lines.json
  const linesPath = path.join(__dirname, '../seed/lines.json');
  fs.writeFileSync(linesPath, JSON.stringify(lines, null, 2), 'utf8');

  res.json(lines[idx]);
});

module.exports = router;
