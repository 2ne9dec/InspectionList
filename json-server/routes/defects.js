/**
 * routes/defects.js — дефекты листков осмотра.
 *
 *   GET    /defectRecords?sheetId=N      — дефекты листка
 *   GET    /defectRecords                — все дефекты (для GlobalDefectSearch)
 *   GET    /defectCounts                 — агрегат active/fixed по каждому листку
 *   GET    /poleDefectStatus?lineId=N    — статус дефектов по опорам линии
 *   POST   /defectRecords                — создать дефект
 *   PATCH  /defectRecords/:id            — обновить дефект (изменить поля)
 *   DELETE /defectRecords/:id            — удалить дефект
 *   PATCH  /defectRecords/:id/fix        — отметить устранённым
 *
 * NO_DEFECT_ID (117) — служебный ID записи «дефекты отсутствуют»,
 * не учитывается в счётчиках active/fixed.
 */
'use strict';
const NO_DEFECT_ID = 117; // «Дефекты отсутствуют» — не дефект, а маркер
const { safe } = require('../lib/routerUtils');

const { Router } = require('express');
const { nextId }                                                   = require('../lib/db');
const { iterAllFiles, findFileBySheetId, getLineDb, saveLineDb }   = require('../lib/helpers');
const { readLineStore }                                            = require('../lib/lineStore');
const { filterByTenancy, canAccessLine }                           = require('../lib/tenancy');
const dashboardCache                                               = require('../lib/dashboardCache');
const fs = require('fs');

const DEFECT_PATCH_ALLOWED = new Set([
  'isFixed', 'dateFixed', 'inspectorFix', 'notes', 'status',
  'masterConclusion', 'resolutionDeadline', 'masterName', 'fixWorkVolume',
]);

const router = Router();

// ── Вспомогательная: итерация файлов с tenancy-фильтром ──────────────────────
// Принимает коллбэк (db, fp) → void; пропускает файлы недоступных линий.
function iterTenantFiles(req, callback) {
  iterAllFiles((fp) => {
    const db = JSON.parse(fs.readFileSync(fp, 'utf8'));
    // Определяем lineId файла по первому листку осмотра
    const firstSheet = (db.inspectionSheets ?? [])[0];
    const lineId = firstSheet?.lineId ?? null;
    if (lineId !== null && !canAccessLine(req, lineId)) return;
    callback(db, fp);
  });
}

// GET /defectCounts — сводка active/fixed по sheetId
router.get('/defectCounts', (req, res) => {
  const counts = new Map();
  iterTenantFiles(req, (db) => {
    (db.defectRecords ?? []).filter((r) => r.defectId !== NO_DEFECT_ID).forEach((r) => {
      const cur = counts.get(r.sheetId) ?? { sheetId: r.sheetId, active: 0, fixed: 0 };
      if (r.isFixed) cur.fixed += 1; else cur.active += 1;
      counts.set(r.sheetId, cur);
    });
  });
  res.json(Array.from(counts.values()));
});

// GET /defectRecords?sheetId=N
router.get('/defectRecords', (req, res) => {
  const { sheetId } = req.query;
  const all = [];
  iterTenantFiles(req, (db) => {
    (db.defectRecords ?? []).filter((r) => r.defectId !== NO_DEFECT_ID).forEach((r) => all.push(r));
  });
  let result = sheetId ? all.filter((r) => String(r.sheetId) === String(sheetId)) : all;
  result.sort((a, b) => a.poleNumber - b.poleNumber);
  res.json(result);
});

// POST /defectRecords
router.post('/defectRecords', (req, res) => {
  const body = req.body;
  // Проверяем доступ к листку (через lineId листка)
  const fp = findFileBySheetId(Number(body.sheetId));
  if (!fp) return res.status(400).json({ error: 'Sheet not found' });

  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const sheet = (data.inspectionSheets ?? []).find((s) => s.id === Number(body.sheetId));
  if (sheet && !canAccessLine(req, sheet.lineId)) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }

  // Дедупликация: sheetId + poleNumber + defectId + phaseId
  const duplicate = (data.defectRecords ?? []).find((r) =>
    r.sheetId    === Number(body.sheetId)  &&
    r.poleNumber === Number(body.poleNumber) &&
    r.defectId   === Number(body.defectId) &&
    (r.phaseId ?? null) === (body.phaseId ? Number(body.phaseId) : null) &&
    !r.isFixed && r.status !== 'rejected',
  );
  if (duplicate) {
    return res.status(409).json({
      error:    'duplicate',
      message:  'Такой дефект уже существует на этой опоре в данном листке',
      existing: duplicate,
    });
  }

  const newId     = nextId('defectRecords');
  const newRecord = { ...body, id: newId };
  data.defectRecords = [...(data.defectRecords ?? []), newRecord];
  saveLineDb(fp, data);
  dashboardCache.invalidate();
  res.status(201).json(newRecord);
});

// PATCH /defectRecords/:id
router.patch('/defectRecords/:id', (req, res) => {
  const id    = Number(req.params.id);
  const patch = Object.fromEntries(Object.entries(req.body).filter(([k]) => DEFECT_PATCH_ALLOWED.has(k)));
  if (Object.keys(patch).length === 0)
    return res.status(400).json({ error: 'Нет разрешённых полей' });

  let found = null;
  iterAllFiles((fp) => {
    if (found) return;
    const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const idx  = (data.defectRecords ?? []).findIndex((r) => r.id === id);
    if (idx !== -1) {
      const sheet = (data.inspectionSheets ?? []).find((s) => s.id === data.defectRecords[idx].sheetId);
      if (sheet && !canAccessLine(req, sheet.lineId)) return; // 403 молчаливо
      data.defectRecords[idx] = { ...data.defectRecords[idx], ...patch };
      saveLineDb(fp, data);
      dashboardCache.invalidate();
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
    const idx  = (data.defectRecords ?? []).findIndex((r) => r.id === id);
    if (idx !== -1) {
      const sheet = (data.inspectionSheets ?? []).find((s) => s.id === data.defectRecords[idx].sheetId);
      if (sheet && !canAccessLine(req, sheet.lineId)) return;
      data.defectRecords.splice(idx, 1);
      saveLineDb(fp, data);
      dashboardCache.invalidate();
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
  const data  = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const sheet = (data.inspectionSheets ?? []).find((s) => s.id === sheetId);
  if (sheet && !canAccessLine(req, sheet.lineId)) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }
  data.defectRecords = (data.defectRecords ?? []).filter((r) => r.sheetId !== sheetId);
  saveLineDb(fp, data);
  dashboardCache.invalidate();
  res.status(200).json({});
});

// GET /defectTrends?lineId=N  — динамика дефектов по месяцам (последние 12 мес.)
router.get('/defectTrends', (req, res) => {
  const lineId = req.query.lineId ? Number(req.query.lineId) : null;

  // Собираем дефекты через iterTenantFiles (уже учитывает tenancy)
  const allDefects = [];
  iterTenantFiles(req, (db) => {
    const firstSheet = (db.inspectionSheets ?? [])[0];
    const dbLineId = firstSheet?.lineId ?? null;
    if (lineId && dbLineId !== lineId) return;
    (db.defectRecords ?? [])
      .filter((r) => r.defectId !== NO_DEFECT_ID)
      .forEach((r) => allDefects.push(r));
  });

  // Инициализируем последние 12 месяцев
  const now = new Date();
  const map = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[key] = { month: key, active: 0, fixed: 0 };
  }

  for (const def of allDefects) {
    const raw = def.dateFound || def.createdAt;
    if (!raw) continue;
    const key = raw.slice(0, 7); // 'YYYY-MM'
    if (!map[key]) continue;
    if (def.isFixed) map[key].fixed++;
    else             map[key].active++;
  }

  res.json(Object.values(map));
});

// GET /poleDefectStatus?lineId=N
// Возвращает: PoleDefectStatus[] = [{ poleNumber, active, fixed }]
router.get('/poleDefectStatus', (req, res) => {
  const lineId = Number(req.query.lineId);
  if (!lineId) return res.status(400).json({ error: 'lineId required' });
  if (!canAccessLine(req, lineId)) return res.status(403).json({ error: 'Доступ запрещён' });
  const defects = readLineStore('defectRecords', lineId) ?? [];

  // Группируем по опоре: считаем active (не устранённые) и fixed (устранённые)
  const map = {};
  for (const d of defects) {
    const p = d.poleNumber;
    if (!map[p]) map[p] = { poleNumber: p, active: 0, fixed: 0 };
    if (d.isFixed) map[p].fixed++;
    else           map[p].active++;
  }

  res.json(Object.values(map));
});

module.exports = router;
