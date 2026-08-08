'use strict';

/**
 * fbDb.js -- подключение к Firebird через node-firebird.
 *
 * Использует пул соединений (5 штук).
 * Все операции возвращают Promise.
 *
 * Переменные окружения (задаются в server/.env):
 *   FB_HOST      -- IP сервера Firebird (по умолчанию 127.0.0.1)
 *   FB_PORT      -- порт (по умолчанию 3050)
 *   FB_DATABASE  -- полный путь к файлу .fdb на сервере
 *   FB_USER      -- пользователь (по умолчанию SYSDBA)
 *   FB_PASSWORD  -- пароль (по умолчанию masterkey)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Проверяем наличие обязательных переменных окружения перед стартом
if (!process.env.FB_PASSWORD) {
  console.error('[FATAL] FB_PASSWORD не задан в server/.env — укажите пароль Firebird явно.');
  process.exit(1);
}

const Firebird = require('node-firebird');

const options = {
  host:           process.env.FB_HOST     || '127.0.0.1',
  port:           Number(process.env.FB_PORT || 3050),
  database:       process.env.FB_DATABASE || 'C:\\InspectionList.fdb',
  user:           process.env.FB_USER     || 'SYSDBA',
  password:       process.env.FB_PASSWORD || 'masterkey',
  lowercase_keys: true,   // колонки возвращаются в lowercase: sheet_id, is_fixed ...
  role:           null,
  pageSize:       4096,
};

// Пул из 5 соединений -- достаточно для 10-20 одновременных пользователей
const pool = Firebird.pool(5, options);

/**
 * SELECT или INSERT ... RETURNING.
 * Всегда возвращает Promise<Array<object>>.
 */
function query(sql, params = []) {
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
function execute(sql, params = []) {
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
function queryOne(sql, params = []) {
  return query(sql, params).then(rows => rows[0] ?? null);
}

/**
 * Следующий ID из последовательности Firebird.
 * type: 'sheets' | 'defects'
 */
async function nextId(type) {
  const seq = type === 'sheets' ? 'GEN_SHEETS_ID' : 'GEN_DEFECTS_ID';
  const row = await queryOne(`SELECT NEXT VALUE FOR ${seq} AS id FROM RDB$DATABASE`);
  if (!row) throw new Error('Не удалось получить следующий ID из последовательности ' + seq);
  return row.id;
}

/**
 * Выполняет набор операций в одной транзакции.
 * fn получает { query, execute, queryOne } и должен вернуть Promise.
 * При ошибке -- автоматический rollback.
 */
function withTransaction(fn) {
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
 * Проверяет соединение с Firebird при старте сервера.
 */
function testConnection() {
  return queryOne('SELECT 1 AS ok FROM RDB$DATABASE');
}

module.exports = { query, execute, queryOne, nextId, withTransaction, testConnection, options };
