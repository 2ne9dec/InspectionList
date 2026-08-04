'use strict';
// Resolve deps from server/node_modules
process.env.NODE_PATH = require('path').resolve(__dirname, '../server/node_modules');
require('module').Module._initPaths();


/**
 * import-sap-direct.js
 *
 * Импортирует линии и напряжения из SAP-экспорта (1.XLSX + 2.XLSX) в Firebird.
 *
 * Использование:
 *   node scripts/import-sap-direct.js [--dry-run]
 *
 * Опции:
 *   --dry-run   Только вывод, БД не менять
 *
 * Что делает:
 *   1. Читает sap_new_voltages.json  — новые напряжения для 3 филиалов
 *   2. Читает sap_lines.json         — линии из SAP для всех 4 филиалов
 *   3. INSERT новые VOLTAGES (если не существуют)
 *   4. UPDATE OR INSERT LINES по имени + filialId:
 *        - линия найдена → обновляет POLE_COUNT и VOLTAGE_ID
 *        - не найдена    → вставляет новую запись
 *
 * Файлы данных генерируются скриптом parse-sap-excel.py
 */

const path = require('path');
const fs   = require('fs');

// Загружаем переменные окружения
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) {
  console.log('[DRY-RUN] — база данных изменена не будет\n');
}

// ── Пути к JSON-файлам с данными ─────────────────────────────────────────────
const VOLTAGES_FILE = path.join(__dirname, 'sap_new_voltages.json');
const LINES_FILE    = path.join(__dirname, 'sap_lines.json');

if (!fs.existsSync(VOLTAGES_FILE) || !fs.existsSync(LINES_FILE)) {
  console.error('Файлы данных не найдены. Сначала запустите parse-sap-excel.py:');
  console.error('  python scripts/parse-sap-excel.py');
  process.exit(1);
}

const newVoltages = JSON.parse(fs.readFileSync(VOLTAGES_FILE, 'utf8'));
const sapLines    = JSON.parse(fs.readFileSync(LINES_FILE,    'utf8'));

// ── Подключение к Firebird ────────────────────────────────────────────────────
const { query, execute } = require('../server/lib/fbDb');

// ── Вспомогательные функции ───────────────────────────────────────────────────

/** Получить максимальный ID в таблице */
async function getMaxId(table) {
  const rows = await query(`SELECT MAX(ID) AS MAX_ID FROM ${table}`);
  return rows[0]?.max_id ?? 0;
}

/** Проверить наличие записи по ID */
async function existsById(table, id) {
  const rows = await query(`SELECT COUNT(*) AS CNT FROM ${table} WHERE ID = ?`, [id]);
  return (rows[0]?.cnt ?? 0) > 0;
}

// ── Шаг 1: Вставляем новые напряжения ────────────────────────────────────────
async function importVoltages() {
  console.log('=== VOLTAGES ===');
  let inserted = 0;
  let skipped  = 0;

  for (const v of newVoltages) {
    const exists = await existsById('VOLTAGES', v.id);
    if (exists) {
      console.log(`  SKIP  VOLTAGES ID=${v.id} "${v.name}" filialId=${v.filialId} — уже существует`);
      skipped++;
      continue;
    }
    console.log(`  INSERT VOLTAGES ID=${v.id} "${v.name}" filialId=${v.filialId}`);
    if (!DRY_RUN) {
      await execute(
        'INSERT INTO VOLTAGES (ID, NAME, FILIAL_ID) VALUES (?, ?, ?)',
        [v.id, v.name, v.filialId]
      );
    }
    inserted++;
  }

  console.log(`  Вставлено: ${inserted}, пропущено: ${skipped}\n`);
}

// ── Шаг 2: Импорт линий ───────────────────────────────────────────────────────
async function importLines() {
  console.log('=== LINES ===');

  let maxId    = await getMaxId('LINES');
  let inserted = 0;
  let updated  = 0;

  for (const line of sapLines) {
    // Ищем линию по имени + филиал (имена SAP уникальны в рамках филиала)
    const existing = await query(
      'SELECT ID, POLE_COUNT, VOLTAGE_ID FROM LINES WHERE NAME = ? AND FILIAL_ID = ?',
      [line.name, line.filialId]
    );

    if (existing.length > 0) {
      const row = existing[0];
      const sameData = row.pole_count === line.poleCount && row.voltage_id === line.voltageId;
      if (sameData) {
        // Данные совпадают — пропускаем
        continue;
      }
      console.log(
        `  UPDATE LINES ID=${row.id} "${line.name}" ` +
        `poleCount ${row.pole_count}→${line.poleCount} voltageId ${row.voltage_id}→${line.voltageId}`
      );
      if (!DRY_RUN) {
        await execute(
          'UPDATE LINES SET POLE_COUNT = ?, VOLTAGE_ID = ? WHERE ID = ?',
          [line.poleCount || null, line.voltageId, row.id]
        );
      }
      updated++;
    } else {
      maxId++;
      console.log(
        `  INSERT LINES ID=${maxId} filialId=${line.filialId} voltageId=${line.voltageId} ` +
        `poleCount=${line.poleCount} "${line.name}"`
      );
      if (!DRY_RUN) {
        await execute(
          `INSERT INTO LINES (ID, NAME, VOLTAGE_ID, FILIAL_ID, POLE_COUNT)
           VALUES (?, ?, ?, ?, ?)`,
          [maxId, line.name, line.voltageId, line.filialId, line.poleCount || null]
        );
      }
      inserted++;
    }
  }

  console.log(`\n  Вставлено: ${inserted}, обновлено: ${updated}`);
}

// ── Главная функция ───────────────────────────────────────────────────────────
async function main() {
  console.log(`Firebird: ${process.env.FB_HOST}:${process.env.FB_PORT} → ${process.env.FB_DATABASE}\n`);

  try {
    await importVoltages();
    await importLines();
    console.log('\nГотово!');
  } catch (err) {
    console.error('Ошибка:', err.message);
    process.exit(1);
  } finally {
    // Небольшая задержка чтобы пул успел закрыться
    setTimeout(() => process.exit(0), 1000);
  }
}

main();
