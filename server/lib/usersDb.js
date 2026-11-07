'use strict';

/**
 * usersDb.js — отдельная база пользователей (FB_DATABASE_USERS).
 *
 * В ней хранятся все учётные записи (логины, хеши паролей, роли, филиал)
 * и права ролей. С листками осмотра и дефектами она не связана: данные
 * филиалов — в их собственных базах.
 *
 * При первом запуске, если базы пользователей ещё нет, сервер:
 *   1) создаёт её и таблицы;
 *   2) переносит пользователей из баз филиалов (логины и хеши паролей
 *      копируются как есть, пароли пользователям менять не нужно);
 *   3) переносит настроенные права ролей, если они были.
 * Таблицы USERS в базах филиалов после этого не используются.
 */

const Firebird = require('node-firebird');
const { query, execute, queryOne, MAIN_DB, USERS_DB_PATH, FILIAL_DB_IDS, baseOptions } = require('./fbDb');

function attachOrCreate() {
  const opts = { ...baseOptions, database: USERS_DB_PATH };
  return new Promise((resolve, reject) => {
    Firebird.attach(opts, (err, db) => {
      if (!err) { db.detach(); return resolve(false); }
      // Базы нет — создаём
      Firebird.create({ ...opts, charset: 'UTF8' }, (err2, db2) => {
        if (err2) return reject(new Error('Не удалось создать базу пользователей: ' + err2.message));
        db2.detach();
        resolve(true);
      });
    });
  });
}

async function relationExists(name, dbKey) {
  const r = await queryOne(
    'SELECT COUNT(*) AS CNT FROM RDB$RELATIONS WHERE TRIM(RDB$RELATION_NAME) = ?', [name], dbKey,
  );
  return Number(r?.cnt ?? 0) > 0;
}

async function createTables() {
  const ddl = [
    `CREATE TABLE FILIALS (
       ID   INTEGER      NOT NULL,
       NAME VARCHAR(200) NOT NULL,
       CONSTRAINT PK_FILIALS PRIMARY KEY (ID))`,
    `CREATE TABLE USERS (
       ID                   VARCHAR(50)  NOT NULL,
       USERNAME             VARCHAR(100) NOT NULL,
       PASSWORD             VARCHAR(200) CHARACTER SET NONE NOT NULL,
       DISPLAY_NAME         VARCHAR(200),
       ROLE                 VARCHAR(50) DEFAULT 'viewer',
       FILIAL_ID            INTEGER,
       MUST_CHANGE_PASSWORD SMALLINT DEFAULT 0 NOT NULL,
       CONSTRAINT PK_USERS PRIMARY KEY (ID),
       CONSTRAINT UQ_USERS_USERNAME UNIQUE (USERNAME),
       CONSTRAINT FK_USERS_FILIAL FOREIGN KEY (FILIAL_ID) REFERENCES FILIALS (ID))`,
    `CREATE TABLE USER_ALLOWED_LINES (
       USER_ID VARCHAR(50) NOT NULL,
       LINE_ID INTEGER     NOT NULL,
       CONSTRAINT PK_UAL PRIMARY KEY (USER_ID, LINE_ID),
       CONSTRAINT FK_UAL_USER FOREIGN KEY (USER_ID) REFERENCES USERS (ID) ON DELETE CASCADE)`,
    `CREATE TABLE USER_ALLOWED_VOLTAGES (
       USER_ID    VARCHAR(50) NOT NULL,
       VOLTAGE_ID INTEGER     NOT NULL,
       CONSTRAINT PK_UAV PRIMARY KEY (USER_ID, VOLTAGE_ID),
       CONSTRAINT FK_UAV_USER FOREIGN KEY (USER_ID) REFERENCES USERS (ID) ON DELETE CASCADE)`,
  ];
  for (const sql of ddl) await execute(sql, [], MAIN_DB);
}

/** Переносит филиалы, пользователей и права ролей из баз филиалов. */
async function migrateFromFilialDbs() {
  const seen = new Set();
  let nextId = 1;
  let moved = 0;
  for (const fid of FILIAL_DB_IDS) {
    const key = String(fid);
    const filials = await query('SELECT ID, NAME FROM FILIALS', [], key);
    for (const f of filials) {
      const exists = await queryOne('SELECT ID FROM FILIALS WHERE ID = ?', [f.id], MAIN_DB);
      if (!exists) await execute('INSERT INTO FILIALS (ID, NAME) VALUES (?, ?)', [f.id, f.name], MAIN_DB);
    }
    if (!(await relationExists('USERS', key))) continue;
    const hasMcp = await queryOne(
      "SELECT COUNT(*) AS CNT FROM RDB$RELATION_FIELDS WHERE TRIM(RDB$RELATION_NAME) = 'USERS' AND TRIM(RDB$FIELD_NAME) = 'MUST_CHANGE_PASSWORD'",
      [], key,
    );
    const users = await query('SELECT * FROM USERS', [], key);
    for (const u of users) {
      const login = String(u.username).trim().toLowerCase();
      if (seen.has(login)) continue;
      seen.add(login);
      const newId = String(nextId++);
      const mcp = Number(hasMcp?.cnt ?? 0) > 0 ? Number(u.must_change_password ?? 0) : 1;
      await execute(
        'INSERT INTO USERS (ID, USERNAME, PASSWORD, DISPLAY_NAME, ROLE, FILIAL_ID, MUST_CHANGE_PASSWORD) VALUES (?,?,?,?,?,?,?)',
        [newId, login, u.password, u.display_name ?? login, u.role ?? 'viewer', u.filial_id ?? null, mcp],
        MAIN_DB,
      );
      for (const r of await query('SELECT LINE_ID FROM USER_ALLOWED_LINES WHERE USER_ID = ?', [u.id], key)) {
        await execute('INSERT INTO USER_ALLOWED_LINES (USER_ID, LINE_ID) VALUES (?, ?)', [newId, r.line_id], MAIN_DB);
      }
      for (const r of await query('SELECT VOLTAGE_ID FROM USER_ALLOWED_VOLTAGES WHERE USER_ID = ?', [u.id], key)) {
        await execute('INSERT INTO USER_ALLOWED_VOLTAGES (USER_ID, VOLTAGE_ID) VALUES (?, ?)', [newId, r.voltage_id], MAIN_DB);
      }
      moved++;
    }
    // Права ролей, если их уже настраивали (хранились в базе первого филиала)
    if (await relationExists('ROLE_PERMISSIONS', key) && !(await relationExists('ROLE_PERMISSIONS', MAIN_DB))) {
      await execute(
        `CREATE TABLE ROLE_PERMISSIONS (
           ROLE VARCHAR(50) NOT NULL, PERMISSION VARCHAR(50) NOT NULL,
           CONSTRAINT PK_ROLE_PERMISSIONS PRIMARY KEY (ROLE, PERMISSION))`, [], MAIN_DB,
      );
      for (const r of await query('SELECT ROLE, PERMISSION FROM ROLE_PERMISSIONS', [], key)) {
        await execute('INSERT INTO ROLE_PERMISSIONS (ROLE, PERMISSION) VALUES (?, ?)', [r.role, r.permission], MAIN_DB);
      }
    }
  }
  return moved;
}

/** Готовит базу пользователей. Вызывается при запуске до остальной инициализации. */
async function ensureUsersDb() {
  if (!USERS_DB_PATH) return;
  const created = await attachOrCreate();
  if (created) console.log(`[users] Создана база пользователей: ${USERS_DB_PATH}`);
  if (!(await relationExists('USERS', MAIN_DB))) {
    await createTables();
    const moved = await migrateFromFilialDbs();
    console.log(`[users] Перенесено пользователей из баз филиалов: ${moved}. Таблицы USERS в базах филиалов больше не используются.`);
  }
}

module.exports = { ensureUsersDb };
