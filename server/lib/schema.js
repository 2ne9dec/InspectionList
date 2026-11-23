'use strict';

/**
 * schema.js — проверка и дополнение структуры базы при запуске сервера.
 *
 * MUST_CHANGE_PASSWORD (USERS): 1 — пользователь обязан сменить пароль при входе
 * (новый пользователь или пароль сброшен администратором).
 * При первом добавлении поля флаг ставится всем существующим пользователям:
 * на пилотном этапе у всех временные пароли.
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { collectInspectors } = require('./sheetInspectors');
const {
  query, execute, queryOne, allDbKeys,
  MAIN_DB, MULTI_DB, FILIAL_DB_IDS,
} = require('./fbDb');

/** Новый элемент и вид дефекта «Линейная арматура» (свободное описание). */
const CUSTOM_ELEMENT_ID   = 31;
const CUSTOM_ELEMENT_NAME = 'Линейная арматура';

/** Дублирующие участки, которых нет отдельными линиями в LineVision. */
const OBSOLETE_LINE_IDS = [455, 456];

/** Известная ошибка: у линии «Красный Берег - Малевичи» даты попали в 2001 год. */
const BAD_DATE_LINE_ID = 187;
const BAD_DATE_YEAR = 2001;
const BAD_DATE_SHIFT_YEARS = 25;
const CUSTOM_DEFECT_ID    = 136;
const CUSTOM_DEFECT_NAME  = 'Свой дефект';

async function columnExists(table, column, dbKey) {
  const rows = await query(
    `SELECT COUNT(*) AS CNT FROM RDB$RELATION_FIELDS
      WHERE TRIM(RDB$RELATION_NAME) = ? AND TRIM(RDB$FIELD_NAME) = ?`,
    [table, column],
    dbKey,
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}

/** Базы, в которых есть справочники линий и дефектов (без отдельной базы пользователей). */
function filialDbKeys() {
  return MULTI_DB ? FILIAL_DB_IDS.map(String) : [MAIN_DB];
}

/**
 * Свободное описание дефекта для «Линейной арматуры».
 * Nullable-поле, поэтому существующие записи не меняются.
 */
async function ensureCustomDefectName(dbKey) {
  if (await columnExists('DEFECT_RECORDS', 'CUSTOM_NAME', dbKey)) return;
  console.log(`[schema] (${dbKey === 'main' ? 'main' : 'filial ' + dbKey}) add column DEFECT_RECORDS.CUSTOM_NAME`);
  await execute('ALTER TABLE DEFECT_RECORDS ADD CUSTOM_NAME VARCHAR(500)', [], dbKey);
}

/**
 * Справочные записи «Линейная арматура» → «Свой дефект».
 * ID фиксированы: клиент получает справочники из seed-файлов и присылает эти ID.
 */
async function ensureCustomDefectReference(dbKey) {
  let element = await queryOne(
    'SELECT ID FROM ELEMENTS WHERE ID = ?', [CUSTOM_ELEMENT_ID], dbKey,
  );
  if (!element) {
    await execute(
      'INSERT INTO ELEMENTS (ID, NAME) VALUES (?, ?)',
      [CUSTOM_ELEMENT_ID, CUSTOM_ELEMENT_NAME], dbKey,
    );
    element = { id: CUSTOM_ELEMENT_ID };
  }

  const defect = await queryOne(
    'SELECT ID FROM DEFECT_TYPES WHERE ID = ?', [CUSTOM_DEFECT_ID], dbKey,
  );
  if (!defect) {
    // SEVERITY — устаревшая колонка существующих БД, оставлена для совместимости.
    await execute(
      'INSERT INTO DEFECT_TYPES (ID, NAME, SEVERITY, ELEMENT_ID) VALUES (?, ?, ?, ?)',
      [CUSTOM_DEFECT_ID, CUSTOM_DEFECT_NAME, 'medium', element.id], dbKey,
    );
  }
}

/** Проверяет и дополняет структуру каждой базы (основной и баз филиалов). */
// Названия линий берём из seed-справочника — он же используется клиентом.
const SEED_LINES = require('../seed/lines.json');
const LINE_NAME_BY_ID = new Map(SEED_LINES.map((line) => [Number(line.id), line.name]));
const LINE_BY_ID = new Map(SEED_LINES.map((line) => [Number(line.id), line]));

/** Приводит названия линий в БД к справочнику (пробелы, дефисы, обрезанные имена). */
async function ensureLineNames(dbKey) {
  let rows;
  try {
    rows = await query('SELECT ID, NAME FROM LINES', [], dbKey);
  } catch (err) {
    if (/Table unknown/i.test(err.message)) return;
    throw err;
  }

  let changed = 0;
  for (const row of rows) {
    const next = LINE_NAME_BY_ID.get(Number(row.id));
    if (next && String(row.name).trim() !== next) {
      await execute('UPDATE LINES SET NAME = ? WHERE ID = ?', [next, row.id], dbKey);
      changed += 1;
    }
  }
  if (changed > 0) console.log(`[schema] (${dbKey}) lines updated: ${changed}`);
}

/**
 * SAP-коды линий из seed-справочника.
 * Заполняем только те линии, для которых код есть в seed. Остальные филиалы
 * (кроме Жлобинских ЭС) не трогаем: там поле остаётся таким, каким было.
 */
async function ensureLineSapCodes(dbKey) {
  let rows;
  try {
    rows = await query('SELECT ID, SAP_CODE FROM LINES', [], dbKey);
  } catch (err) {
    if (/Table unknown/i.test(err.message)) return;
    throw err;
  }

  const targetFilial = /^\d+$/.test(String(dbKey)) ? Number(dbKey) : null;
  let changed = 0;
  for (const row of rows) {
    const seed = LINE_BY_ID.get(Number(row.id));
    if (!seed?.sapCode) continue;
    if (targetFilial != null && Number(seed.filialId) !== targetFilial) continue;
    if (String(row.sap_code ?? '').trim() === seed.sapCode) continue;
    await execute('UPDATE LINES SET SAP_CODE = ? WHERE ID = ?', [seed.sapCode, row.id], dbKey);
    changed += 1;
  }
  if (changed > 0) console.log(`[schema] (${dbKey}) line SAP codes updated: ${changed}`);
}

/**
 * Границы опор из seed-справочника. Excel «Координаты линий ЖЭС» — источник
 * истины по количеству и диапазону опор для Жлобинских ЭС.
 */
async function ensureLinePoles(dbKey) {
  const targetFilial = /^\d+$/.test(String(dbKey)) ? Number(dbKey) : null;
  if (targetFilial != null && targetFilial !== 2) return;

  let rows;
  try {
    rows = await query('SELECT ID, POLE_START, POLE_END, POLE_COUNT FROM LINES', [], dbKey);
  } catch (err) {
    if (/Table unknown/i.test(err.message)) return;
    throw err;
  }

  let changed = 0;
  for (const row of rows) {
    const seed = LINE_BY_ID.get(Number(row.id));
    if (!seed || Number(seed.filialId) !== 2) continue;
    if (
      Number(row.pole_start) === Number(seed.poleStart) &&
      Number(row.pole_end) === Number(seed.poleEnd) &&
      Number(row.pole_count) === Number(seed.poleCount)
    ) continue;
    await execute(
      'UPDATE LINES SET POLE_START = ?, POLE_END = ?, POLE_COUNT = ? WHERE ID = ?',
      [seed.poleStart ?? null, seed.poleEnd ?? null, seed.poleCount ?? null, row.id],
      dbKey,
    );
    changed += 1;
  }
  if (changed > 0) console.log(`[schema] (${dbKey}) line pole ranges updated: ${changed}`);
}

/**
 * Удаляет дублирующие участки 455/456, если на них нет листков и дефектов.
 * В LineVision это не отдельные линии, а части существующих.
 */
async function ensureObsoleteLinesRemoved(dbKey) {
  const targetFilial = /^\d+$/.test(String(dbKey)) ? Number(dbKey) : null;
  if (targetFilial != null && targetFilial !== 2) return;

  for (const id of OBSOLETE_LINE_IDS) {
    const line = await queryOne('SELECT ID, FILIAL_ID FROM LINES WHERE ID = ?', [id], dbKey);
    if (!line) continue;
    if (targetFilial == null && Number(line.filial_id) !== 2) continue;

    const sheets = await queryOne(
      'SELECT COUNT(*) AS C FROM INSPECTION_SHEETS WHERE LINE_ID = ?', [id], dbKey,
    );
    const defects = await queryOne(
      'SELECT COUNT(*) AS C FROM DEFECT_RECORDS WHERE LINE_ID = ?', [id], dbKey,
    );
    if (Number(sheets?.c ?? 0) > 0 || Number(defects?.c ?? 0) > 0) {
      console.log(`[schema] (${dbKey}) keep line ${id}: has sheets or defects`);
      continue;
    }

    await execute('DELETE FROM LINES WHERE ID = ? AND FILIAL_ID = 2', [id], dbKey);
    console.log(`[schema] (${dbKey}) removed duplicate line ${id}`);
  }
}

/**
 * Известная ошибка дат: дефекты линии 187 (Красный Берег - Малевичи)
 * записались как 2001-04-24/25 вместо 2026-04-24/25. Исправляем автоматически
 * при запуске, чтобы не править каждую строку вручную.
 */
async function ensureKnownDefectDates(dbKey) {
  const targetFilial = /^\d+$/.test(String(dbKey)) ? Number(dbKey) : null;
  if (targetFilial != null && targetFilial !== 2) return;

  let rows;
  try {
    rows = await query(
      `SELECT d.ID
         FROM DEFECT_RECORDS d
         JOIN INSPECTION_SHEETS s ON s.ID = d.SHEET_ID
        WHERE d.LINE_ID = ?
          AND s.FILIAL_ID = 2
          AND EXTRACT(YEAR FROM d.DATE_FOUND) = ?`,
      [BAD_DATE_LINE_ID, BAD_DATE_YEAR],
      dbKey,
    );
  } catch (err) {
    if (/Table unknown/i.test(err.message)) return;
    throw err;
  }

  for (const row of rows) {
    await execute(
      `UPDATE DEFECT_RECORDS
          SET DATE_FOUND = DATEADD(${BAD_DATE_SHIFT_YEARS} YEAR TO DATE_FOUND)
        WHERE ID = ?`,
      [row.id],
      dbKey,
    );
  }
  if (rows.length > 0) {
    console.log(`[schema] (${dbKey}) fixed ${rows.length} defect dates (${BAD_DATE_YEAR} -> ${BAD_DATE_YEAR + BAD_DATE_SHIFT_YEARS})`);
  }
}

/**
 * Поля листка: кто осматривал (может быть несколько ФИО) и кто объединил.
 * Существующие листки получают INSPECTORS = CREATED_BY.
 */
async function ensureSheetMetaColumns(dbKey) {
  if (!(await columnExists('INSPECTION_SHEETS', 'INSPECTORS', dbKey))) {
    console.log(`[schema] (${dbKey}) add column INSPECTION_SHEETS.INSPECTORS`);
    await execute('ALTER TABLE INSPECTION_SHEETS ADD INSPECTORS VARCHAR(1000)', [], dbKey);
  }
  if (!(await columnExists('INSPECTION_SHEETS', 'MERGED_BY', dbKey))) {
    console.log(`[schema] (${dbKey}) add column INSPECTION_SHEETS.MERGED_BY`);
    await execute('ALTER TABLE INSPECTION_SHEETS ADD MERGED_BY VARCHAR(300)', [], dbKey);
  }
  await execute(
    `UPDATE INSPECTION_SHEETS
        SET INSPECTORS = CREATED_BY
      WHERE (INSPECTORS IS NULL OR TRIM(INSPECTORS) = '')
        AND CREATED_BY IS NOT NULL`,
    [],
    dbKey,
  );

  // Уже существующие объединённые листки: CREATED_BY — тот, кто объединил.
  // Осматривавших восстанавливаем по ФИО из дефектов.
  const mergedSheets = await query(
    `SELECT ID, CREATED_BY
       FROM INSPECTION_SHEETS
      WHERE MERGED_BY IS NULL
        AND NOTES IS NOT NULL
        AND (NOTES STARTING WITH 'Объединение листков'
             OR NOTES STARTING WITH 'Объединено')`,
    [],
    dbKey,
  );
  for (const sheet of mergedSheets) {
    const defectInspectors = await query(
      `SELECT INSPECTOR_FIND
         FROM DEFECT_RECORDS
        WHERE SHEET_ID = ?
          AND INSPECTOR_FIND IS NOT NULL
          AND TRIM(INSPECTOR_FIND) <> ''`,
      [sheet.id],
      dbKey,
    );
    const inspectors = collectInspectors(
      defectInspectors.map((row) => ({ created_by: row.inspector_find })),
    );
    await execute(
      `UPDATE INSPECTION_SHEETS
          SET MERGED_BY = ?, INSPECTORS = ?
        WHERE ID = ?`,
      [sheet.created_by ?? null, (inspectors.join(', ') || sheet.created_by) ?? null, sheet.id],
      dbKey,
    );
  }
  if (mergedSheets.length > 0) {
    console.log(`[schema] (${dbKey}) merged sheets restored: ${mergedSheets.length}`);
  }
}

/** SAP-код дефекта: переносим код линии на конкретную опору (только Жлобинские ЭС). */
async function ensureDefectSapCode(dbKey) {
  if (!(await columnExists('DEFECT_RECORDS', 'SAP_CODE', dbKey))) {
    console.log(`[schema] (${dbKey}) add column DEFECT_RECORDS.SAP_CODE`);
    await execute('ALTER TABLE DEFECT_RECORDS ADD SAP_CODE VARCHAR(30)', [], dbKey);
  }
}

/**
 * Заполняет SAP-код у существующих дефектов Жлобинских ЭС.
 * В остальных филиалах поле остаётся пустым.
 */
async function ensureDefectSapCodes(dbKey) {
  const targetFilial = /^\d+$/.test(String(dbKey)) ? Number(dbKey) : null;

  if (targetFilial != null && targetFilial !== 2) {
    await execute('UPDATE DEFECT_RECORDS SET SAP_CODE = NULL WHERE SAP_CODE IS NOT NULL', [], dbKey);
    return;
  }

  if (targetFilial == null) {
    await execute(
      `UPDATE DEFECT_RECORDS SET SAP_CODE = NULL
        WHERE SHEET_ID IN (SELECT ID FROM INSPECTION_SHEETS WHERE FILIAL_ID <> ?)`,
      [2],
      dbKey,
    );
  }

  const rows = await query(
    `SELECT d.ID, l.SAP_CODE
       FROM DEFECT_RECORDS d
       JOIN LINES l ON l.ID = d.LINE_ID
       JOIN INSPECTION_SHEETS s ON s.ID = d.SHEET_ID
      WHERE l.SAP_CODE IS NOT NULL
        ${targetFilial == null ? 'AND s.FILIAL_ID = 2' : ''}`,
    [],
    dbKey,
  );

  for (const row of rows) {
    await execute(
      'UPDATE DEFECT_RECORDS SET SAP_CODE = ? WHERE ID = ?',
      [row.sap_code, row.id],
      dbKey,
    );
  }
  if (rows.length > 0) console.log(`[schema] (${dbKey}) defect SAP codes updated: ${rows.length}`);
}

async function ensureSchema() {
  for (const dbKey of allDbKeys()) {
    const name = dbKey === 'main' ? 'основная' : `филиал ${dbKey}`;
    if (!(await columnExists('USERS', 'MUST_CHANGE_PASSWORD', dbKey))) {
      console.log(`[schema] (${name}) add column USERS.MUST_CHANGE_PASSWORD`);
      await execute('ALTER TABLE USERS ADD MUST_CHANGE_PASSWORD SMALLINT DEFAULT 0 NOT NULL', [], dbKey);
      await execute('UPDATE USERS SET MUST_CHANGE_PASSWORD = 1', [], dbKey);
      console.log(`[schema] (${name}) all users must change password on next login`);
    }
  }

  for (const dbKey of filialDbKeys()) {
    await ensureCustomDefectName(dbKey);
    await ensureDefectSapCode(dbKey);
    await ensureSheetMetaColumns(dbKey);
    await ensureCustomDefectReference(dbKey);
    await ensureObsoleteLinesRemoved(dbKey);
    await ensureLineNames(dbKey);
    await ensureLineSapCodes(dbKey);
    await ensureLinePoles(dbKey);
    await ensureDefectSapCodes(dbKey);
    await ensureKnownDefectDates(dbKey);
  }

  // Разрешения на удалённые дубликаты линий больше не нужны.
  try {
    await execute(
      'DELETE FROM USER_ALLOWED_LINES WHERE LINE_ID IN (?, ?)',
      OBSOLETE_LINE_IDS,
      MAIN_DB,
    );
  } catch (err) {
    if (!/Table unknown/i.test(err.message)) throw err;
  }
}

/**
 * Администратор системы должен существовать, иначе некому создавать пользователей.
 * Если его нет (новая установка), создаётся пользователь admin со случайным
 * временным паролем: пароль выводится один раз в консоль сервера, при первом
 * входе система потребует его сменить. В файлах настроек паролей нет.
 */
async function ensureGlobalAdmin() {
  if (!MULTI_DB) return;
  const existing = await queryOne(
    "SELECT ID FROM USERS WHERE FILIAL_ID IS NULL AND ROLE = 'admin'", [], MAIN_DB,
  );
  if (existing) return;
  const login = (await queryOne("SELECT ID FROM USERS WHERE USERNAME = 'admin'", [], MAIN_DB)) ? 'sysadmin' : 'admin';
  const temp = crypto.randomBytes(9).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 10) + '7a';
  const ids = await query('SELECT ID FROM USERS', [], MAIN_DB);
  const newId = String(ids.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1);
  await execute(
    `INSERT INTO USERS (ID, USERNAME, PASSWORD, DISPLAY_NAME, ROLE, FILIAL_ID, MUST_CHANGE_PASSWORD)
     VALUES (?, ?, ?, 'Администратор системы', 'admin', NULL, 1)`,
    [newId, login, bcrypt.hashSync(temp, Number(process.env.BCRYPT_ROUNDS ?? 12))],
    MAIN_DB,
  );
  console.log(`[users] system admin created. login: ${login}, temp password: ${temp} - must be changed on first login.`);
}

module.exports = { ensureSchema, ensureGlobalAdmin };
