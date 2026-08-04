'use strict';
// Resolve deps from server/node_modules
process.env.NODE_PATH = require('path').resolve(__dirname, '../server/node_modules');
require('module').Module._initPaths();


/**
 * create-db.js
 *
 * Создаёт базу данных Firebird с нуля:
 *   1. Создаёт .fdb файл
 *   2. Применяет firebird-schema.sql (таблицы, индексы, последовательности)
 *   3. Загружает справочники (filials, voltages, lines, elements, defectTypes, phases ...)
 *
 * Использование (из папки server/):
 *   node create-db.js
 *
 * Предварительно убедись что в server/.env прописан правильный FB_DATABASE.
 */

const path     = require('path');
const fs       = require('fs');
const Firebird = require('node-firebird');

require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

// ── Настройки соединения ──────────────────────────────────────────────────────
const options = {
  host:           process.env.FB_HOST     || '127.0.0.1',
  port:           Number(process.env.FB_PORT || 3050),
  database:       process.env.FB_DATABASE,
  user:           process.env.FB_USER     || 'SYSDBA',
  password:       process.env.FB_PASSWORD || 'masterkey',
  lowercase_keys: false,
  pageSize:       8192,
};

if (!options.database) {
  console.error('Задай FB_DATABASE в server/.env');
  process.exit(1);
}

const SEED_DIR = path.join(__dirname, '../server/seed');

// ── Утилиты ───────────────────────────────────────────────────────────────────

function readJson(name) {
  const fp = path.join(SEED_DIR, name);
  if (!fs.existsSync(fp)) return null;
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

/** Выполнить один SQL-запрос через открытое соединение. */
function exec(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.execute(sql, params, (err, result) => {
      if (err) return reject(new Error(`SQL error: ${err.message}\nSQL: ${sql.trim().slice(0, 120)}`));
      resolve(result);
    });
  });
}

/** SELECT через открытое соединение. */
function sel(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) return reject(new Error(`SQL error: ${err.message}\nSQL: ${sql.trim().slice(0, 120)}`));
      resolve(Array.isArray(rows) ? rows : (rows ? [rows] : []));
    });
  });
}

/** Создать БД через Firebird.create(). */
function createDatabase() {
  return new Promise((resolve, reject) => {
    console.log(`Создаём БД: ${options.database}`);
    Firebird.create(options, (err, db) => {
      if (err) return reject(new Error('Ошибка создания БД: ' + err.message));
      console.log('  БД создана.');
      resolve(db);
    });
  });
}

/** Подключиться к существующей БД. */
function attachDatabase() {
  return new Promise((resolve, reject) => {
    Firebird.attach(options, (err, db) => {
      if (err) return reject(err);
      resolve(db);
    });
  });
}

/** Отключиться от БД. */
function detach(db) {
  return new Promise((resolve) => db.detach(resolve));
}

// ── Применение схемы ──────────────────────────────────────────────────────────

async function applySchema(db) {
  console.log('\nПрименяем схему (firebird-schema.sql)...');
  const sqlRaw = fs.readFileSync(
    path.join(__dirname, 'firebird-schema.sql'),
    'utf8'
  );

  // Разбиваем по ; и убираем клиентские директивы SET NAMES / SET SQL DIALECT
  const stmts = sqlRaw
    .split(';')
    .map(s => s.replace(/\/\*[\s\S]*?\*\//g, '').trim())  // убираем комментарии
    .filter(s => s.length > 0)
    .filter(s => !/^SET\s+(NAMES|SQL\s+DIALECT)/i.test(s))
    .filter(s => s.toUpperCase() !== 'COMMIT');

  for (const stmt of stmts) {
    process.stdout.write(`  ${stmt.slice(0, 60).replace(/\s+/g, ' ')}...`);
    try {
      await exec(db, stmt);
      process.stdout.write(' OK\n');
    } catch (err) {
      // Игнорируем "already exists" — на случай повторного запуска
      if (/already exists/i.test(err.message)) {
        process.stdout.write(' (уже существует)\n');
      } else {
        process.stdout.write('\n');
        throw err;
      }
    }
  }
  console.log('  Схема применена.');
}

// ── Загрузка справочников ─────────────────────────────────────────────────────

async function seedTable(db, table, rows, columns) {
  if (!rows || rows.length === 0) return;
  const colList    = columns.map(c => c[0]).join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO ${table} (${colList}) VALUES (${placeholders})`;

  for (const row of rows) {
    const values = columns.map(([, key]) => (row[key] !== undefined ? row[key] : null));
    try {
      await exec(db, sql, values);
    } catch (err) {
      if (/violation of PRIMARY|already exists/i.test(err.message)) continue; // дубль — пропускаем
      throw err;
    }
  }
}

async function loadSeedData(db) {
  console.log('\nЗагружаем справочники...');

  // Филиалы
  const filials = readJson('filials.json');
  await seedTable(db, 'FILIALS', filials, [['ID', 'id'], ['NAME', 'name']]);
  console.log(`  FILIALS: ${filials?.length ?? 0} записей`);

  // Напряжения (Жлобин, IDs 1-5)
  const voltages = readJson('voltages.json');
  await seedTable(db, 'VOLTAGES', voltages, [['ID', 'id'], ['NAME', 'name'], ['FILIAL_ID', 'filialId']]);
  console.log(`  VOLTAGES: ${voltages?.length ?? 0} записей`);

  // Линии (существующие вручную введённые)
  const lines = readJson('lines.json');
  if (lines) {
    for (const l of lines) {
      try {
        await exec(db,
          `INSERT INTO LINES (ID, NAME, VOLTAGE_ID, FILIAL_ID, POLE_RANGE, POLE_START, POLE_END,
           POLE_COUNT, YEAR_BUILT, YEAR_LAST_OVERHAUL, LENGTH_KM, POLE_TYPE, WIRE_TYPE, NOTES)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            l.id, l.name, l.voltageId ?? null, l.filialId ?? 2,
            l.poleRange ?? null, l.poleStart ?? null, l.poleEnd ?? null,
            l.poleCount ?? null, l.yearBuilt ?? null, l.yearLastOverhaul ?? null,
            l.lengthKm ?? null, l.poleType ?? null, l.wireType ?? null, l.notes ?? null,
          ]
        );
      } catch (err) {
        if (/violation of PRIMARY/i.test(err.message)) continue;
        throw err;
      }
    }
  }
  console.log(`  LINES: ${lines?.length ?? 0} записей`);

  // Элементы
  const elements = readJson('elements.json');
  await seedTable(db, 'ELEMENTS', elements, [['ID', 'id'], ['NAME', 'name']]);
  console.log(`  ELEMENTS: ${elements?.length ?? 0} записей`);

  // Типы дефектов
  const defectTypes = readJson('defectTypes.json');
  if (defectTypes) {
    for (const dt of defectTypes) {
      try {
        await exec(db,
          'INSERT INTO DEFECT_TYPES (ID, NAME, SEVERITY, ELEMENT_ID) VALUES (?, ?, ?, ?)',
          [dt.id, dt.name, dt.severity ?? null, dt.elementId ?? null]
        );
      } catch (err) {
        if (/violation of PRIMARY/i.test(err.message)) continue;
        throw err;
      }
    }
  }
  console.log(`  DEFECT_TYPES: ${defectTypes?.length ?? 0} записей`);

  // Фазы
  const phases = readJson('phases.json');
  await seedTable(db, 'PHASES', phases, [['ID', 'id'], ['NAME', 'name']]);
  console.log(`  PHASES: ${phases?.length ?? 0} записей`);

  // phaseElementIds
  const phaseEls = readJson('phaseElementIds.json');
  if (phaseEls) {
    for (const [phaseId, elementIds] of Object.entries(phaseEls)) {
      for (const elId of elementIds) {
        try {
          await exec(db,
            'INSERT INTO PHASE_ELEMENT_IDS (PHASE_ID, ELEMENT_ID) VALUES (?, ?)',
            [Number(phaseId), elId]
          );
        } catch (err) {
          if (/violation of PRIMARY/i.test(err.message)) continue;
          throw err;
        }
      }
    }
    console.log(`  PHASE_ELEMENT_IDS: загружено`);
  }

  // filialVoltageFilter
  const fvf = readJson('filialVoltageFilter.json');
  if (fvf) {
    for (const [filialId, voltageIds] of Object.entries(fvf)) {
      for (const vId of voltageIds) {
        try {
          await exec(db,
            'INSERT INTO FILIAL_VOLTAGE_FILTER (FILIAL_ID, VOLTAGE_ID) VALUES (?, ?)',
            [Number(filialId), vId]
          );
        } catch (err) {
          if (/violation of PRIMARY/i.test(err.message)) continue;
          throw err;
        }
      }
    }
    console.log(`  FILIAL_VOLTAGE_FILTER: загружено`);
  }

  console.log('  Справочники загружены.');
}

// ── Настройка генераторов ─────────────────────────────────────────────────────

async function resetSequences(db) {
  console.log('\nНастраиваем последовательности...');
  const rows = await sel(db, 'SELECT MAX(ID) AS MX FROM LINES');
  const maxLine = rows[0]?.MX ?? 0;
  await exec(db, `ALTER SEQUENCE GEN_SHEETS_ID RESTART WITH 1`);
  await exec(db, `ALTER SEQUENCE GEN_DEFECTS_ID RESTART WITH 1`);
  console.log(`  Последовательности сброшены. Max LINES.ID = ${maxLine}`);
}

// ── Главная функция ───────────────────────────────────────────────────────────

async function main() {
  console.log(`Firebird: ${options.host}:${options.port}`);
  console.log(`БД:       ${options.database}\n`);

  // Создаём новую базу
  const db = await createDatabase();

  try {
    await applySchema(db);
    await loadSeedData(db);
    await resetSequences(db);
    await detach(db);

    console.log('\n✓ База данных создана и заполнена справочниками.');
    console.log('\nСледующий шаг — импорт данных SAP:');
    console.log('  node import-sap-direct.js --dry-run');
    console.log('  node import-sap-direct.js');
  } catch (err) {
    await detach(db).catch(() => {});
    console.error('\nОшибка:', err.message);
    process.exit(1);
  }

  setTimeout(() => process.exit(0), 500);
}

main();
