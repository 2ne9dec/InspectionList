// routes/sheets.js — листки осмотра
'use strict';
const dashboardCache = require('../lib/dashboardCache');
const { safe } = require('../lib/routerUtils');

const { Router } = require('express');
const { nextId, seedDb } = require('../lib/db');
const { DATA_DIR, iterAllFiles, getLinePath, getLineDb, saveLineDb, findFileBySheetId } = require('../lib/helpers');
const { filterByTenancy, canAccessLine } = require('../lib/tenancy');
const fs   = require('fs');
const path = require('path');

const SHEET_FILTER_ALLOWED = new Set(['filialId', 'voltageId', 'lineId', 'createdBy']);

const router = Router();

// GET /inspectionSheets
router.get('/inspectionSheets', (req, res) => {
  const all = [];
  iterAllFiles((fp) => {
    const db = JSON.parse(fs.readFileSync(fp, 'utf8'));
    (db.inspectionSheets ?? []).forEach((s) => all.push(s));
  });

  let result = filterByTenancy(req, all, (s) => s.lineId);
  result.sort((a, b) => (b.createdDate ?? '').localeCompare(a.createdDate ?? ''));

  const { _sort, _order, ...rawFilters } = req.query;
  const filters = Object.fromEntries(
    Object.entries(rawFilters).filter(([k]) => SHEET_FILTER_ALLOWED.has(k)),
  );
  for (const [key, val] of Object.entries(filters)) {
    result = result.filter((s) => String(s[key]) === String(val));
  }

  // Пагинация: _page (1-based) + _limit
  const page  = Math.max(1, Number(req.query._page)  || 1);
  const limit = Math.min(500, Math.max(1, Number(req.query._limit) || result.length));
  const total = result.length;
  const start = (page - 1) * limit;
  const items = result.slice(start, start + limit);

  res.setHeader('X-Total-Count', total);
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
  res.json(items);
});

// GET /inspectionSheets/:id
router.get('/inspectionSheets/:id', (req, res) => {
  const id = Number(req.params.id);
  let found = null;
  iterAllFiles((fp) => {
    if (found) return;
    const db    = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const sheet = (db.inspectionSheets ?? []).find((s) => s.id === id);
    if (sheet) found = sheet;
  });
  if (!found) return res.status(404).json({ error: 'Not found' });
  if (!canAccessLine(req, found.lineId)) return res.status(403).json({ error: 'Доступ запрещён' });
  res.json(found);
});

// POST /inspectionSheets
router.post('/inspectionSheets', (req, res) => {
  const body = req.body;
  const { filialId, voltageId, lineId, createdDate } = body;
  if (!filialId || !voltageId || !lineId || !createdDate)
    return res.status(400).json({ error: 'Отсутствуют обязательные поля' });
  if (!canAccessLine(req, Number(lineId)))
    return res.status(403).json({ error: 'Доступ запрещён' });
  const filepath = getLinePath(filialId, voltageId, lineId, createdDate, seedDb);
  if (!filepath) return res.status(400).json({ error: 'Линия не найдена' });
  const data = getLineDb(filepath);
  const duplicate = (data.inspectionSheets ?? []).find((s) => s.createdDate === createdDate);
  if (duplicate)
    return res.status(409).json({ error: 'Листок осмотра на эту дату уже существует', existing: duplicate });
  const newId    = nextId('inspectionSheets');
  const newSheet = { ...body, id: newId };
  data.inspectionSheets = [...(data.inspectionSheets ?? []), newSheet];
  saveLineDb(filepath, data);
  dashboardCache.invalidate();
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
  if (!canAccessLine(req, orig.lineId)) return res.status(403).json({ error: 'Доступ запрещён' });
  const dup = (data.inspectionSheets ?? []).find((s) => s.createdDate === newDate);
  if (dup) return res.status(409).json({ error: `Листок на ${newDate} уже существует`, existing: dup });
  const newId    = nextId('inspectionSheets');
  const newSheet = {
    ...orig,
    id: newId,
    createdDate: newDate,
    status: 'active',
    notes: orig.notes ? `Копия от ${orig.createdDate}. ${orig.notes}` : `Копия от ${orig.createdDate}`,
  };
  data.inspectionSheets.push(newSheet);
  saveLineDb(fp, data);
  dashboardCache.invalidate();
  res.status(201).json(newSheet);
});

// PATCH /inspectionSheets/:id
router.patch('/inspectionSheets/:id', (req, res) => {
  const id = Number(req.params.id);
  const fp = findFileBySheetId(id);
  if (!fp) return res.status(404).json({ error: 'Листок не найден' });
  const data = getLineDb(fp);
  const idx  = (data.inspectionSheets ?? []).findIndex((s) => s.id === id);
  if (idx < 0) return res.status(404).json({ error: 'Листок не найден в файле' });
  if (!canAccessLine(req, data.inspectionSheets[idx].lineId))
    return res.status(403).json({ error: 'Доступ запрещён' });
  const updates = {};
  if (req.body.status !== undefined) updates.status = req.body.status;
  if (req.body.notes  !== undefined) updates.notes  = req.body.notes;
  data.inspectionSheets[idx] = { ...data.inspectionSheets[idx], ...updates };
  saveLineDb(fp, data);
  dashboardCache.invalidate();
  res.json(data.inspectionSheets[idx]);
});

// DELETE /inspectionSheets/:id — каскадно удаляет дефекты листка
router.delete('/inspectionSheets/:id', (req, res) => {
  const id = Number(req.params.id);
  const fp = findFileBySheetId(id);
  if (!fp) return res.status(404).json({ error: 'Not found' });
  const data = getLineDb(fp);
  const idx  = (data.inspectionSheets ?? []).findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  if (!canAccessLine(req, data.inspectionSheets[idx].lineId))
    return res.status(403).json({ error: 'Доступ запрещён' });
  data.inspectionSheets.splice(idx, 1);
  // Каскадное удаление дефектов этого листка
  data.defectRecords = (data.defectRecords ?? []).filter((r) => r.sheetId !== id);
  saveLineDb(fp, data);
  dashboardCache.invalidate();
  res.json({ ok: true });
});

// POST /inspectionSheets/merge — объединить несколько листков в один
router.post('/inspectionSheets/merge', (req, res) => {
  const { ids, createdDate, createdBy } = req.body;
  if (!Array.isArray(ids) || ids.length < 2 || !createdDate)
    return res.status(400).json({ error: 'ids (array ≥ 2) и createdDate обязательны' });

  // Найти все исходные листки
  const sources = [];
  for (const id of ids) {
    const fp = findFileBySheetId(Number(id));
    if (!fp) return res.status(404).json({ error: `Листок ${id} не найден` });
    const db    = getLineDb(fp);
    const sheet = (db.inspectionSheets ?? []).find((s) => s.id === Number(id));
    if (!sheet) return res.status(404).json({ error: `Листок ${id} не найден в файле` });
    if (!canAccessLine(req, sheet.lineId)) return res.status(403).json({ error: 'Доступ запрещён' });
    const defects = (db.defectRecords ?? []).filter((r) => r.sheetId === Number(id));
    sources.push({ fp, db, sheet, defects });
  }

  // Все листки должны быть одной линии
  const lineIds = [...new Set(sources.map((s) => s.sheet.lineId))];
  if (lineIds.length > 1)
    return res.status(400).json({ error: 'Все листки должны быть одной линии' });

  const base     = sources[0].sheet;
  const targetFp = getLinePath(base.filialId, base.voltageId, base.lineId, createdDate, seedDb);
  if (!targetFp) return res.status(400).json({ error: 'Линия не найдена' });
  const targetDb = getLineDb(targetFp);

  const newId  = nextId('inspectionSheets');
  const merged = {
    ...base,
    id:          newId,
    createdDate,
    createdBy:   createdBy ?? base.createdBy,
    status:      'active',
    notes:       `Объединение листков от ${sources.map((s) => s.sheet.createdDate).join(', ')}`,
  };

  // Копируем дефекты всех источников с новым sheetId
  let defectCursor = nextId('defectRecords');
  const mergedDefects = [];
  for (const src of sources) {
    for (const d of src.defects) {
      const { id: _did, ...rest } = d;
      mergedDefects.push({ ...rest, id: defectCursor++, sheetId: newId });
    }
  }

  targetDb.inspectionSheets = [...(targetDb.inspectionSheets ?? []), merged];
  targetDb.defectRecords    = [...(targetDb.defectRecords ?? []), ...mergedDefects];
  saveLineDb(targetFp, targetDb);
  dashboardCache.invalidate();

  // Удаляем исходные листки и их дефекты
  const processedFiles = new Set();
  for (const src of sources) {
    if (processedFiles.has(src.fp)) continue;
    processedFiles.add(src.fp);
    if (src.fp === targetFp) continue; // уже обновлён выше
    const db = getLineDb(src.fp);
    const idsInFile = sources.filter((s) => s.fp === src.fp).map((s) => s.sheet.id);
    db.inspectionSheets = (db.inspectionSheets ?? []).filter((s) => !idsInFile.includes(s.id));
    db.defectRecords    = (db.defectRecords ?? []).filter((r) => !idsInFile.includes(r.sheetId));
    saveLineDb(src.fp, db);
    dashboardCache.invalidate();
  }

  res.status(201).json(merged);
});

module.exports = router;
