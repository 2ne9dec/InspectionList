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
const { query, execute, queryOne, allDbKeys, MAIN_DB, MULTI_DB } = require('./fbDb');

async function columnExists(table, column, dbKey) {
  const rows = await query(
    `SELECT COUNT(*) AS CNT FROM RDB$RELATION_FIELDS
      WHERE TRIM(RDB$RELATION_NAME) = ? AND TRIM(RDB$FIELD_NAME) = ?`,
    [table, column],
    dbKey,
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
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
