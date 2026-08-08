'use strict';

/**
 * routes/sheets.js -- листки осмотра (Firebird).
 *
 * GET    /inspectionSheets
 * GET    /inspectionSheets/:id
 * POST   /inspectionSheets
 * POST   /inspectionSheets/:id/clone
 * PATCH  /inspectionSheets/:id
 * DELETE /inspectionSheets/:id
 * POST   /inspectionSheets/merge
 */

const { Router } = require('express');
const { query, execute, queryOne, nextId, withTransaction } = require('../lib/fbDb');
const { canAccessLine, lineWhereClause } = require('../lib/tenancy');

const router = Router();

// ── Маппер строки -> JS-объект ────────────────────────────────────────────────
function toSheet(row) {
  return {
    id:          row.id,
    filialId:    row.filial_id,
    voltageId:   row.voltage_id,
    lineId:      row.line_id,
    createdBy:   row.created_by   ?? null,
    createdDate: row.created_date ?? null,  // CAST AS VARCHAR уже строка
    status:      row.status       ?? 'active',
    notes:       row.notes        ?? null,
  };
}

const SELECT_FIELDS = `
  ID, FILIAL_ID, VOLTAGE_ID, LINE_ID, CREATED_BY,
  CAST(CREATED_DATE AS VARCHAR(10)) AS CREATED_DATE,
  STATUS, NOTES`;

const SELECT_SHEET = `SELECT${SELECT_FIELDS}\n  FROM INSPECTION_SHEETS`;

// ── GET /inspectionSheets — список листков осмотра ────────────────────────────
router.get('/inspectionSheets', async (req, res) => {
  try {
    const { filialId, voltageId, lineId, createdBy, dateFrom, dateTo, _page, _limit } = req.query;
    const lf = lineWhereClause(req);

    // Условия WHERE (без FIRST/SKIP — добавляются ниже если нужна пагинация)
    let where  = ' WHERE 1=1' + lf.sql;
    const params = [...lf.params];

    if (filialId)  { where += ' AND FILIAL_ID = ?';  params.push(Number(filialId)); }
    if (voltageId) { where += ' AND VOLTAGE_ID = ?'; params.push(Number(voltageId)); }
    if (lineId)    { where += ' AND LINE_ID = ?';    params.push(Number(lineId)); }
    if (createdBy) { where += ' AND CREATED_BY = ?'; params.push(createdBy); }

    // Серверная фильтрация по дате (фронт посылает dateFrom / dateTo)
    if (dateFrom) { where += ' AND CAST(CREATED_DATE AS VARCHAR(10)) >= ?'; params.push(dateFrom); }
    if (dateTo)   { where += ' AND CAST(CREATED_DATE AS VARCHAR(10)) <= ?'; params.push(dateTo); }

    const order = ' ORDER BY CREATED_DATE DESC';

    const page  = Math.max(1, Number(_page)  || 0);
    const limit = Math.min(500, Math.max(1, Number(_limit) || 0));

    let items;
    let total;

    if (page && limit) {
      // Два запроса: COUNT(*) + Firebird FIRST/SKIP ─────────────────────────────
      const countSql = 'SELECT COUNT(*) AS cnt FROM INSPECTION_SHEETS' + where;
      const [{ cnt }] = await query(countSql, params);
      total = Number(cnt);

      const skip    = (page - 1) * limit;
      // FIRST и SKIP идут первыми в списке параметров
      const pageSql = `SELECT FIRST ? SKIP ?${SELECT_FIELDS}\n  FROM INSPECTION_SHEETS${where}${order}`;
      const rows    = await query(pageSql, [limit, skip, ...params]);
      items = rows.map(toSheet);
    } else {
      // Без пагинации — вернуть всё (с применёнными WHERE-фильтрами)
      const rows = await query(SELECT_SHEET + where + order, params);
      total = rows.length;
      items = rows.map(toSheet);
    }

    res.setHeader('X-Total-Count', total);
    res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /inspectionSheets/:id — один лист ────────────────────────────────────
router.get('/inspectionSheets/:id', async (req, res) => {
  try {
    const id  = Number(req.params.id);
    const row = await queryOne(SELECT_SHEET + ' WHERE ID = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (!canAccessLine(req, row.line_id))
      return res.status(403).json({ error: 'Доступ запрещён' });
    res.json(toSheet(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /inspectionSheets — создать лист ────────────────────────────────────
router.post('/inspectionSheets', async (req, res) => {
  try {
    const { filialId, voltageId, lineId, createdDate, createdBy, status, notes } = req.body;
    if (!filialId || !voltageId || !lineId || !createdDate)
      return res.status(400).json({ error: 'Отсутствуют обязательные поля' });
    if (!canAccessLine(req, Number(lineId)))
      return res.status(403).json({ error: 'Доступ запрещён' });

    // Проверка дубликата
    const dup = await queryOne(
      'SELECT ID FROM INSPECTION_SHEETS WHERE LINE_ID = ? AND CAST(CREATED_DATE AS VARCHAR(10)) = ?',
      [Number(lineId), createdDate],
    );
    if (dup)
      return res.status(409).json({
        error:    'Листок осмотра на эту дату уже существует',
        existing: await queryOne(SELECT_SHEET + ' WHERE ID = ?', [dup.id]).then(r => r && toSheet(r)),
      });

    const id = await nextId('sheets');
    await execute(
      `INSERT INTO INSPECTION_SHEETS
         (ID, FILIAL_ID, VOLTAGE_ID, LINE_ID, CREATED_BY, CREATED_DATE, STATUS, NOTES)
       VALUES (?, ?, ?, ?, ?, CAST(? AS DATE), ?, ?)`,
      [id, Number(filialId), Number(voltageId), Number(lineId),
       createdBy ?? null, createdDate, status ?? 'active', notes ?? null],
    );

    const row = await queryOne(SELECT_SHEET + ' WHERE ID = ?', [id]);
    res.status(201).json(toSheet(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /inspectionSheets/:id/clone — клонировать лист ──────────────────────
router.post('/inspectionSheets/:id/clone', async (req, res) => {
  try {
    const id                    = Number(req.params.id);
    const { newDate, createdBy } = req.body;
    if (!newDate) return res.status(400).json({ error: 'newDate обязателен (YYYY-MM-DD)' });

    const orig = await queryOne(SELECT_SHEET + ' WHERE ID = ?', [id]);
    if (!orig) return res.status(404).json({ error: 'Листок не найден' });
    if (!canAccessLine(req, orig.line_id))
      return res.status(403).json({ error: 'Доступ запрещён' });

    const dup = await queryOne(
      'SELECT ID FROM INSPECTION_SHEETS WHERE LINE_ID = ? AND CAST(CREATED_DATE AS VARCHAR(10)) = ?',
      [orig.line_id, newDate],
    );
    if (dup)
      return res.status(409).json({
        error:    `Листок на ${newDate} уже существует`,
        existing: toSheet(await queryOne(SELECT_SHEET + ' WHERE ID = ?', [dup.id])),
      });

    const newId    = await nextId('sheets');
    const newNotes = orig.notes
      ? `Копия от ${orig.created_date}. ${orig.notes}`
      : `Копия от ${orig.created_date}`;

    await execute(
      `INSERT INTO INSPECTION_SHEETS
         (ID, FILIAL_ID, VOLTAGE_ID, LINE_ID, CREATED_BY, CREATED_DATE, STATUS, NOTES)
       VALUES (?, ?, ?, ?, ?, CAST(? AS DATE), 'active', ?)`,
      // createdBy из запроса (кто делает клон), fallback на оригинал
      [newId, orig.filial_id, orig.voltage_id, orig.line_id,
       createdBy ?? orig.created_by, newDate, newNotes],
    );

    const row = await queryOne(SELECT_SHEET + ' WHERE ID = ?', [newId]);
    res.status(201).json(toSheet(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /inspectionSheets/:id — обновить лист ──────────────────────────────
router.patch('/inspectionSheets/:id', async (req, res) => {
  try {
    const id  = Number(req.params.id);
    const row = await queryOne(SELECT_SHEET + ' WHERE ID = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Листок не найден' });
    if (!canAccessLine(req, row.line_id))
      return res.status(403).json({ error: 'Доступ запрещён' });

    const sets   = [];
    const params = [];
    if (req.body.createdDate !== undefined) { sets.push('CREATED_DATE = CAST(? AS DATE)'); params.push(req.body.createdDate); }
    if (req.body.createdBy  !== undefined) { sets.push('CREATED_BY = ?');                 params.push(req.body.createdBy); }
    if (req.body.status !== undefined) { sets.push('STATUS = ?'); params.push(req.body.status); }
    if (req.body.notes  !== undefined) { sets.push('NOTES = ?');  params.push(req.body.notes); }
    if (sets.length === 0) return res.status(400).json({ error: 'Нет полей для обновления' });

    params.push(id);
    await execute(`UPDATE INSPECTION_SHEETS SET ${sets.join(', ')} WHERE ID = ?`, params);

    const updated = await queryOne(SELECT_SHEET + ' WHERE ID = ?', [id]);
    res.json(toSheet(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /inspectionSheets/:id — удалить лист ──────────────────────────────
router.delete('/inspectionSheets/:id', async (req, res) => {
  try {
    const id  = Number(req.params.id);
    const row = await queryOne('SELECT ID, LINE_ID FROM INSPECTION_SHEETS WHERE ID = ?', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    if (!canAccessLine(req, row.line_id))
      return res.status(403).json({ error: 'Доступ запрещён' });

    // FK constraint: сначала дефекты, потом лист
    await execute('DELETE FROM DEFECT_RECORDS WHERE SHEET_ID = ?', [id]);
    await execute('DELETE FROM INSPECTION_SHEETS WHERE ID = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /inspectionSheets/merge — объединить листы ──────────────────────────
router.post('/inspectionSheets/merge', async (req, res) => {
  try {
    const { ids, createdDate, createdBy } = req.body;
    if (!Array.isArray(ids) || ids.length < 2 || !createdDate)
      return res.status(400).json({ error: 'ids (array >= 2) и createdDate обязательны' });

    // Загружаем исходные листки
    const sources = [];
    for (const sid of ids) {
      const row = await queryOne(SELECT_SHEET + ' WHERE ID = ?', [Number(sid)]);
      if (!row) return res.status(404).json({ error: `Листок ${sid} не найден` });
      if (!canAccessLine(req, row.line_id))
        return res.status(403).json({ error: 'Доступ запрещён' });
      const defects = await query(
        'SELECT * FROM DEFECT_RECORDS WHERE SHEET_ID = ?', [Number(sid)],
      );
      sources.push({ sheet: row, defects });
    }

    // Все листки должны быть одной линии
    const lineIds = [...new Set(sources.map(s => s.sheet.line_id))];
    if (lineIds.length > 1)
      return res.status(400).json({ error: 'Все листки должны быть одной линии' });

    const base = sources[0].sheet;

    // Выполняем всё в транзакции
    const merged = await withTransaction(async (tx) => {
      // Проверка дубликата итогового листка
      const dup = await tx.queryOne(
        'SELECT ID FROM INSPECTION_SHEETS WHERE LINE_ID = ? AND CAST(CREATED_DATE AS VARCHAR(10)) = ?',
        [base.line_id, createdDate],
      );
      if (dup) throw Object.assign(new Error(`Листок на ${createdDate} уже существует`), { status: 409 });

      const newId    = await nextId('sheets');
      const newNotes = `Объединение листков от ${sources.map(s => s.sheet.created_date).join(', ')}`;

      await tx.execute(
        `INSERT INTO INSPECTION_SHEETS
           (ID, FILIAL_ID, VOLTAGE_ID, LINE_ID, CREATED_BY, CREATED_DATE, STATUS, NOTES)
         VALUES (?, ?, ?, ?, ?, CAST(? AS DATE), 'active', ?)`,
        [newId, base.filial_id, base.voltage_id, base.line_id,
         createdBy ?? base.created_by, createdDate, newNotes],
      );

      // Копируем дефекты всех источников
      for (const src of sources) {
        for (const d of src.defects) {
          const defId = await nextId('defects');
          await tx.execute(
            `INSERT INTO DEFECT_RECORDS
               (ID, SHEET_ID, LINE_ID, POLE_NUMBER, DEFECT_ID, PHASE_ID, ELEMENT_ID,
                DATE_FOUND, INSPECTOR_FIND, IS_FIXED, DATE_FIXED, INSPECTOR_FIX,
                INSULATOR_COUNT, SPAN_RANGE, NOTES, STATUS,
                MASTER_CONCLUSION, RESOLUTION_DEADLINE, MASTER_NAME, FIX_WORK_VOLUME)
             VALUES (?,?,?,?,?,?,?,
                     CAST(? AS DATE),?,?,CAST(? AS DATE),?,
                     ?,?,?,?,
                     ?,CAST(? AS DATE),?,?)`,
            [defId, newId, d.line_id ?? base.line_id,
             d.pole_number, d.defect_id, d.phase_id ?? null, d.element_id ?? null,
             d.date_found   ? String(d.date_found).slice(0,10)  : null,
             d.inspector_find, d.is_fixed ?? 0,
             d.date_fixed   ? String(d.date_fixed).slice(0,10)  : null,
             d.inspector_fix ?? null,
             d.insulator_count ?? null, d.span_range ?? null,
             d.notes ?? null, d.status ?? null,
             d.master_conclusion ?? null,
             d.resolution_deadline ? String(d.resolution_deadline).slice(0,10) : null,
             d.master_name ?? null, d.fix_work_volume ?? null],
          );
        }
      }

      // Удаляем исходные листки (дефекты уже скопированы)
      for (const src of sources) {
        await tx.execute('DELETE FROM DEFECT_RECORDS WHERE SHEET_ID = ?', [src.sheet.id]);
        await tx.execute('DELETE FROM INSPECTION_SHEETS WHERE ID = ?', [src.sheet.id]);
      }

      return newId;
    });

    const row = await queryOne(SELECT_SHEET + ' WHERE ID = ?', [merged]);
    res.status(201).json(toSheet(row));
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
