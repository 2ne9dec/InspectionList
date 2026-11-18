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
const {
  query, execute, queryOne, allDbKeys,
  MAIN_DB, MULTI_DB, FILIAL_DB_IDS,
} = require('./fbDb');

/** Новый элемент и вид дефекта «Линейная арматура» (свободное описание). */
const CUSTOM_ELEMENT_ID   = 31;
const CUSTOM_ELEMENT_NAME = 'Линейная арматура';
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
  console.log(`[schema] (${dbKey === 'main' ? 'основная' : 'филиал ' + dbKey}) Добавляю поле DEFECT_RECORDS.CUSTOM_NAME`);
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
    await execute(
      'INSERT INTO DEFECT_TYPES (ID, NAME, SEVERITY, ELEMENT_ID) VALUES (?, ?, ?, ?)',
      [CUSTOM_DEFECT_ID, CUSTOM_DEFECT_NAME, 'medium', element.id], dbKey,
    );
  }
}

/** Проверяет и дополняет структуру каждой базы (основной и баз филиалов). */
async function ensureSchema() {
  for (const dbKey of allDbKeys()) {
    const name = dbKey === 'main' ? 'основная' : `филиал ${dbKey}`;
    if (!(await columnExists('USERS', 'MUST_CHANGE_PASSWORD', dbKey))) {
      console.log(`[schema] (${name}) Добавляю поле USERS.MUST_CHANGE_PASSWORD`);
      await execute('ALTER TABLE USERS ADD MUST_CHANGE_PASSWORD SMALLINT DEFAULT 0 NOT NULL', [], dbKey);
      await execute('UPDATE USERS SET MUST_CHANGE_PASSWORD = 1', [], dbKey);
      console.log(`[schema] (${name}) Всем пользователям назначена смена пароля при следующем входе`);
    }
  }

  for (const dbKey of filialDbKeys()) {
    await ensureCustomDefectName(dbKey);
    await ensureCustomDefectReference(dbKey);
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
  console.log(`[users] Создан администратор системы. Логин: ${login}, временный пароль: ${temp} — сменить при первом входе.`);
}

module.exports = { ensureSchema, ensureGlobalAdmin };
