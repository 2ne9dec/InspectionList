'use strict';

/**
 * fbDb.js -- подключение к Firebird через node-firebird.
 *
 * Один сервер приложения — несколько баз: у каждого филиала своя база.
 * Пул соединений на каждую базу. Все операции возвращают Promise.
 *
 * Переменные окружения (задаются в server/.env):
 *   FB_HOST        -- IP сервера Firebird (по умолчанию 127.0.0.1)
 *   FB_PORT        -- порт (по умолчанию 3050)
 *   FB_DATABASE_1  -- база Гомельских ЭС   (номер = ID филиала в таблице FILIALS)
 *   FB_DATABASE_2  -- база Жлобинских ЭС
 *   FB_DATABASE_3  -- база Мозырских ЭС
 *   FB_DATABASE_4  -- база Речицких ЭС
 *   FB_DATABASE_USERS -- отдельная база пользователей: все учётные записи и права
 *                     ролей. С листками и дефектами не связана. Создаётся сервером
 *                     при первом запуске (пользователи переносятся из баз филиалов).
 *                     Если не задана — пользователи хранятся в базах филиалов.
 *   FB_DATABASE    -- режим одной общей базы (если базы филиалов не заданы)
 *   FB_USER        -- пользователь (по умолчанию SYSDBA)
 *   FB_PASSWORD    -- пароль (обязателен, значения по умолчанию нет)
 *
 * Какая база используется для запроса, определяет контекст (AsyncLocalStorage):
 * middleware ставит филиал пользователя (или выбранный наблюдателем РУП),
 * и query/execute/... внутри обработчика автоматически идут в базу этого филиала.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Проверяем наличие обязательных переменных окружения перед стартом
if (!process.env.FB_PASSWORD) {
  console.error('[FATAL] FB_PASSWORD не задан в server/.env — укажите пароль Firebird явно.');
  process.exit(1);
}

const Firebird = require('node-firebird');
const { AsyncLocalStorage } = require('async_hooks');

const baseOptions = {
  host:           process.env.FB_HOST     || '127.0.0.1',
  port:           Number(process.env.FB_PORT || 3050),
  user:           process.env.FB_USER     || 'SYSDBA',
  password:       process.env.FB_PASSWORD,
  lowercase_keys: true,   // колонки возвращаются в lowercase: sheet_id, is_fixed ...
  role:           null,
  pageSize:       4096,
};

/** Ключ основной базы (главный администратор, наблюдатели РУП). */
const MAIN_DB = 'main';

/** Пути к базам: '1'..'4' -> базы филиалов, 'main' -> база пользователей РУП. */
const DB_PATHS = new Map();
for (const [key, value] of Object.entries(process.env)) {
  const m = key.match(/^FB_DATABASE_(\d+)$/);
  if (m && value) DB_PATHS.set(m[1], value);
}
const FILIAL_KEYS = [...DB_PATHS.keys()].sort((a, b) => Number(a) - Number(b));
/** Путь к отдельной базе пользователей (FB_DATABASE_USERS; FB_DATABASE_RUP — прежнее имя). */
const USERS_DB_PATH = process.env.FB_DATABASE_USERS || process.env.FB_DATABASE_RUP || null;
if (USERS_DB_PATH) {
  DB_PATHS.set(MAIN_DB, USERS_DB_PATH);
} else if (FILIAL_KEYS.length === 0) {
  // Режим одной общей базы
  DB_PATHS.set(MAIN_DB, process.env.FB_DATABASE || 'C:\\InspectionList.fdb');
}

/** ID филиалов, у которых задана своя база. Пусто — режим одной общей базы. */
const FILIAL_DB_IDS = FILIAL_KEYS.map(Number);
const MULTI_DB = FILIAL_DB_IDS.length > 0;

// Пул из 5 соединений на базу -- достаточно для 10-20 одновременных пользователей филиала
const pools = new Map();
for (const [key, database] of DB_PATHS) {
  pools.set(key, Firebird.pool(5, { ...baseOptions, database }));
}
// Без отдельной базы РУП пользователи РУП хранятся в базе первого филиала (Гомельские ЭС)
if (!pools.has(MAIN_DB)) pools.set(MAIN_DB, pools.get(FILIAL_KEYS[0]));
/** Отдельная база пользователей задана: все учётные записи хранятся в ней. */
const HAS_SEPARATE_MAIN = MULTI_DB && USERS_DB_PATH != null;

/** Контекст запроса: в какую базу идут запросы. */
const dbContext = new AsyncLocalStorage();

/** Ключ базы для филиала: своя база филиала или основная (режим одной базы). */
function dbKeyForFilial(filialId) {
  if (filialId == null) return MAIN_DB;
  const key = String(filialId);
  return pools.has(key) ? key : MAIN_DB;
}

/** Есть ли у филиала своя база (или работает режим одной общей базы). */
function isKnownFilial(filialId) {
  return !MULTI_DB || pools.has(String(filialId));
}

/** Выполнить fn в контексте базы dbKey ('main' или ID филиала строкой). */
function runInDb(dbKey, fn) {
  return dbContext.run({ dbKey }, fn);
}

function currentPool() {
  const key = dbContext.getStore()?.dbKey ?? MAIN_DB;
  return pools.get(key) ?? pools.get(MAIN_DB);
}

function poolFor(dbKey) {
  if (dbKey === undefined) return currentPool();
  return pools.get(dbKey) ?? pools.get(MAIN_DB);
}

/**
 * SELECT или INSERT ... RETURNING.
 * Всегда возвращает Promise<Array<object>>.
 * dbKey — явно указать базу; по умолчанию — база текущего контекста запроса.
 */
function query(sql, params = [], dbKey) {
  const pool = poolFor(dbKey);
  return new Promise((resolve, reject) => {
    pool.get((err, db) => {
      if (err) return reject(new Error('Firebird pool error: ' + err.message));
      db.query(sql, params, (err2, result) => {
        db.detach();
        if (err2) return reject(new Error('Firebird query error: ' + err2.message));
        resolve(Array.isArray(result) ? result : (result ? [result] : []));
      });
    });
  });
}

/**
 * UPDATE / DELETE / INSERT без RETURNING.
 */
function execute(sql, params = [], dbKey) {
  const pool = poolFor(dbKey);
  return new Promise((resolve, reject) => {
    pool.get((err, db) => {
      if (err) return reject(new Error('Firebird pool error: ' + err.message));
      db.execute(sql, params, (err2, result) => {
        db.detach();
        if (err2) return reject(new Error('Firebird execute error: ' + err2.message));
        resolve(result);
      });
    });
  });
}

/**
 * Первая строка результата или null.
 */
function queryOne(sql, params = [], dbKey) {
  return query(sql, params, dbKey).then(rows => rows[0] ?? null);
}

/**
 * Следующий ID из последовательности Firebird (в базе текущего контекста).
 * type: 'sheets' | 'defects'
 */
async function nextId(type) {
  const seq = type === 'sheets' ? 'GEN_SHEETS_ID' : 'GEN_DEFECTS_ID';
  const row = await queryOne(`SELECT NEXT VALUE FOR ${seq} AS id FROM RDB$DATABASE`);
  if (!row) throw new Error('Не удалось получить следующий ID из последовательности ' + seq);
  return row.id;
}

/**
 * Выполняет набор операций в одной транзакции (в базе текущего контекста).
 * fn получает { query, execute, queryOne } и должен вернуть Promise.
 * При ошибке -- автоматический rollback.
 */
function withTransaction(fn) {
  const pool = currentPool();
  return new Promise((resolve, reject) => {
    pool.get((err, db) => {
      if (err) return reject(new Error('Firebird pool error: ' + err.message));

      db.transaction(Firebird.ISOLATION_READ_COMMITTED, (err2, tx) => {
        if (err2) { db.detach(); return reject(err2); }

        const txQuery = (sql, params = []) => new Promise((res, rej) => {
          tx.query(sql, params, (e, r) => {
            if (e) return rej(new Error('TX query error: ' + e.message));
            res(Array.isArray(r) ? r : (r ? [r] : []));
          });
        });

        const txExecute = (sql, params = []) => new Promise((res, rej) => {
          tx.execute(sql, params, (e, r) => {
            if (e) return rej(new Error('TX execute error: ' + e.message));
            res(r);
          });
        });

        const txQueryOne = (sql, params = []) =>
          txQuery(sql, params).then(rows => rows[0] ?? null);

        fn({ query: txQuery, execute: txExecute, queryOne: txQueryOne })
          .then(result => {
            tx.commit(commitErr => {
              db.detach();
              if (commitErr) return reject(commitErr);
              resolve(result);
            });
          })
          .catch(fnErr => {
            tx.rollback(() => {
              db.detach();
              reject(fnErr);
            });
          });
      });
    });
  });
}

/**
 * Проверяет соединение со всеми базами при старте сервера.
 */
async function testConnection() {
  for (const [key, database] of DB_PATHS) {
    // Базу пользователей сервер создаёт сам при первом запуске (usersDb.js)
    if (key === MAIN_DB && USERS_DB_PATH) continue;
    try {
      await queryOne('SELECT 1 AS ok FROM RDB$DATABASE', [], key);
    } catch (e) {
      throw new Error(`База ${key === MAIN_DB ? 'основная' : 'филиала ' + key} (${database}): ${e.message}`);
    }
  }
}

/** Ключ физической базы: без отдельной базы РУП 'main' — это база первого филиала. */
function physicalDbKey(dbKey) {
  return DB_PATHS.has(dbKey) ? dbKey : FILIAL_KEYS[0];
}

/** Все ключи баз (каждая физическая база один раз): базы филиалов + отдельная база РУП. */
function allDbKeys() {
  return [...DB_PATHS.keys()];
}

module.exports = {
  query, execute, queryOne, nextId, withTransaction, testConnection,
  MAIN_DB, MULTI_DB, FILIAL_DB_IDS, HAS_SEPARATE_MAIN, USERS_DB_PATH, baseOptions, dbKeyForFilial, isKnownFilial, runInDb, allDbKeys, physicalDbKey,
};
