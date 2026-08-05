'use strict';
// Подключаем зависимости из server/node_modules
process.env.NODE_PATH = require('path').resolve(__dirname, '../server/node_modules');
require('module').Module._initPaths();

/**
 * import-sap-direct.js
 *
 * Импортирует линии из sap_lines.json (сгенерированного parse-sap-excel.py v2) в Firebird.
 *
 * Использование:
 *   node scripts/import-sap-direct.js [--dry-run]
 *
 * Что делает:
 *   1. Читает sap_lines.json
 *   2. Для каждой записи ищет линию в БД по имени + filialId
 *      - Найдена → обновляет POLE_START, POLE_END, POLE_COUNT, VOLTAGE_ID
 *      - Не найдена → вставляет новую запись (отпайки и новые линии)
 *
 * Файл sap_lines.json генерируется:
 *   python scripts/parse-sap-excel.py --lines 2.XLSX --poles 1.XLSX
 */

const path = require('path');
const fs   = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) console.log('[DRY-RUN] — база данных изменена не будет\n');

const LINES_FILE = path.join(__dirname, 'sap_lines.json');
if (!fs.existsSync(LINES_FILE)) {
  console.error('Файл не найден:', LINES_FILE);
  console.error('Сначала запустите: python scripts/parse-sap-excel.py');
  process.exit(1);
}

const sapLines = JSON.parse(fs.readFileSync(LINES_FILE, 'utf8'));

// SAP-коды которые намеренно исключены из импорта:
// - административные записи (СЛЭП ЖЭС/МЭС/РЭС, Списание матер.)
// - линии выведенные из эксплуатации (330/750 кВ Гомель, межгосударственные)
// - устаревшие/ошибочные записи SAP
const SKIP_SAP_CODES = new Set([
  'VL035-000242', // ВЛ-35кВ Букча - Хильчицы
  'VL110-000252', // ВЛ-110 №2 Жл.Западная - Корд
  'VL035-000221', // ВЛ 35 кВ Пузичи - Мозырь-Ленино
  'VL035-000222', // ВЛ 35 кВ Нежин - Заполье
  'VL035-000223', // ВЛ 35 кВ Пузичи - Гоцк
  'VL035-000224', // ВЛ 35 кВ Журавичи - Пролетарий
  'VL110-000082', // Списание матер./Прочие работы СЛЭП РЭС
  'VL110-000115', // Списание матер, прочие работы СЛЭП ЖЭС
  'VL110-000196', // ТО Списание матер./Прочие раб. СЛЭП МЭС
  'VL110-000311', // ВЛ-110 кВ (пустая запись)
  'VL110-000341', // ВЛ 110 кВ Домановичи - Старобин
  'VL110-000342', // ВЛ 110 кВ Микашевичи-110 - Вересница
  'VL110-000343', // ВЛ 110 кВ Ольгомель - Вересница
  'VL110-000344', // ВЛ 110 кВ Глуск - Бабирово
  'VL220-000009', // ВЛ-220 кВ Светлогорск220 - Центролит(РЭС)
  'VL330-000061', // ВЛ 330 кВ Белорусская - Калийная
  'VL330-000062', // ВЛ 330 кВ Белорусская - Микашевичи
  'VL330-000063', // ВЛ 330 кВ Белорусская - Мирадино
  'VL330-000064', // ВЛ 330 кВ Белорусская - ТЭЦ-5
  'VL330-000065', // ВЛ 330 кВ Мирадино - ГРЭС-20
  'VL330-000066', // ВЛ 330 кВ Славутич - Чернигов
  'VL330-000067', // ВЛ 750 кВ Белорусская - Смоленская АЭС
  'VL110-000228-503', // Отпайка ПС Криничный (двухцепной) - объединено в -502
  'VL110-000228-504', // Отпайка ПС Криничная (однацепной) - объединено в -502
]);
const { query, execute } = require('../server/lib/fbDb');

// ── Вспомогательные функции ───────────────────────────────────────────────────

async function getMaxId(table) {
  const rows = await query(`SELECT MAX(ID) AS MAX_ID FROM ${table}`);
  return rows[0]?.max_id ?? 0;
}

// ── Импорт линий ──────────────────────────────────────────────────────────────
async function importLines() {
  console.log(`=== LINES (всего в JSON: ${sapLines.length}) ===\n`);

  let maxId    = await getMaxId('LINES');
  let inserted = 0;
  let updated  = 0;
  let skipped  = 0;

  for (const line of sapLines) {
    // Пропускаем намеренно исключённые SAP-коды
    if (SKIP_SAP_CODES.has(line.sapCode)) { skipped++; continue; }

    // Ищем по имени + филиал (имена SAP уникальны в рамках филиала)
    const existing = await query(
      `SELECT ID, POLE_START, POLE_END, POLE_COUNT, VOLTAGE_ID
         FROM LINES WHERE NAME = ? AND FILIAL_ID = ?`,
      [line.name, line.filialId]
    );

    if (existing.length > 0) {
      const row = existing[0];

      // Считаем данные одинаковыми если все ключевые поля совпадают
      const same =
        row.pole_start === line.poleStart &&
        row.pole_end   === line.poleEnd   &&
        row.pole_count === line.poleCount &&
        row.voltage_id === line.voltageId;

      if (same) {
        skipped++;
        continue;
      }

      console.log(
        `  UPDATE ID=${row.id} "${line.name}"\n` +
        `    poleStart: ${row.pole_start ?? 'null'} → ${line.poleStart ?? 'null'}\n` +
        `    poleEnd:   ${row.pole_end   ?? 'null'} → ${line.poleEnd   ?? 'null'}\n` +
        `    poleCount: ${row.pole_count ?? 'null'} → ${line.poleCount ?? 'null'}`
      );

      if (!DRY_RUN) {
        await execute(
          `UPDATE LINES SET
             POLE_START = ?, POLE_END = ?, POLE_COUNT = ?, VOLTAGE_ID = ?
           WHERE ID = ?`,
          [
            line.poleStart ?? null,
            line.poleEnd   ?? null,
            line.poleCount ?? null,
            line.voltageId,
            row.id,
          ]
        );
      }
      updated++;

    } else {
      // Новая линия — отпайка или линия которой ещё нет в базе
      maxId++;
      console.log(
        `  INSERT ID=${maxId} filialId=${line.filialId} voltageId=${line.voltageId} ` +
        `${line.poleStart ?? 'null'}..${line.poleEnd ?? 'null'} ` +
        `(${line.poleCount ?? 'null'} оп.) "${line.name}"`
      );

      if (!DRY_RUN) {
        await execute(
          `INSERT INTO LINES (ID, NAME, VOLTAGE_ID, FILIAL_ID, POLE_START, POLE_END, POLE_COUNT)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            maxId,
            line.name,
            line.voltageId,
            line.filialId,
            line.poleStart ?? null,
            line.poleEnd   ?? null,
            line.poleCount ?? null,
          ]
        );
      }
      inserted++;
    }
  }

  console.log(`\nВставлено: ${inserted}, обновлено: ${updated}, без изменений: ${skipped}`);
}

// ── Главная функция ───────────────────────────────────────────────────────────
async function main() {
  console.log(`Firebird: ${process.env.FB_HOST}:${process.env.FB_PORT} → ${process.env.FB_DATABASE}\n`);

  try {
    await importLines();
    console.log('\nГотово!');
  } catch (err) {
    console.error('Ошибка:', err.message);
    process.exit(1);
  } finally {
    setTimeout(() => process.exit(0), 1000);
  }
}

main();
