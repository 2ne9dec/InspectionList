'use strict';
process.env.NODE_PATH = require('path').resolve(__dirname, '../server/node_modules');
require('module').Module._initPaths();

/**
 * delete-specific-lines.js
 *
 * Удаляет линии и классы напряжения, которые вышли из эксплуатации.
 * exactName: true  -- точное совпадение (NAME = ?)
 * exactName: false -- подстрока (CONTAINING), регистронезависимо
 *
 * Использование:
 *   node scripts/delete-specific-lines.js [--dry-run]
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const { query, execute } = require('../server/lib/fbDb');

const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) console.log('[DRY-RUN] -- база не изменяется\n');

const LINES_TO_DELETE = [
  // ── Жлобин ──────────────────────────────────────────────────────────────────
  { name: 'Журавичи - Пролетарий',  filialId: 2, exactName: false, comment: 'ВЛ 35 кВ Журавичи - Пролетарий (ошибка САП)' },
  { name: 'Жл.Западная - Корд',     filialId: 2, exactName: false, comment: 'ВЛ-110 N2 Жл.Западная - Корд (лишняя)' },
  { name: 'СЛЭП ЖЭС',              filialId: 2, exactName: false, comment: 'Административная SAP-запись Жлобин' },
  // ── Гомель ──────────────────────────────────────────────────────────────────
  { name: 'Мирадино - Осиповичи',     filialId: 1, exactName: false, comment: 'ВЛ 220 кВ Мирадино - Осиповичи' },
  { name: 'Белорусская - Калийная',   filialId: 1, exactName: false, comment: 'ВЛ 330 кВ Белорусская - Калийная' },
  { name: 'Белорусская - Микашевичи', filialId: 1, exactName: false, comment: 'ВЛ 330 кВ Белорусская - Микашевичи' },
  { name: 'Белорусская - Мирадино',   filialId: 1, exactName: false, comment: 'ВЛ 330 кВ Белорусская - Мирадино' },
  { name: 'Белорусская - Тэц',        filialId: 1, exactName: false, comment: 'ВЛ 330 кВ Белорусская - ТЭЦ-5' },
  { name: 'Мирадино - ГРЭС',          filialId: 1, exactName: false, comment: 'ВЛ 330 кВ Мирадино - ГРЭС-20' },
  { name: 'Славутич - Чернигов',      filialId: 1, exactName: false, comment: 'ВЛ 330 кВ Славутич - Чернигов' },
  { name: 'Белорусская - Смоленская', filialId: 1, exactName: false, comment: 'ВЛ 750 кВ Белорусская - Смоленская АЭС' },
  // ── Мозырь ──────────────────────────────────────────────────────────────────
  { name: 'Пузичи - Мозырь',              filialId: 3, exactName: false, comment: 'ВЛ 35 кВ Пузичи - Мозырь-Ленино' },
  { name: 'Нежин - Заполье',              filialId: 3, exactName: false, comment: 'ВЛ 35 кВ Нежин - Заполье' },
  { name: 'Пузичи - Гоцк',               filialId: 3, exactName: false, comment: 'ВЛ 35 кВ Пузичи - Гоцк' },
  { name: 'Букча - Хильчицы',            filialId: 3, exactName: false, comment: 'ВЛ 35 кВ Букча - Хильчицы' },
  { name: 'Домановичи - Старобин',        filialId: 3, exactName: false, comment: 'ВЛ 110 кВ Домановичи - Старобин' },
  { name: 'Микашевичи-110 - Вересница',   filialId: 3, exactName: false, comment: 'ВЛ 110 кВ Микашевичи-110 - Вересница' },
  { name: 'Ольгомель - Вересница',        filialId: 3, exactName: false, comment: 'ВЛ 110 кВ Ольгомель - Вересница' },
  { name: 'СЛЭП МЭС',                    filialId: 3, exactName: false, comment: 'Административная SAP-запись Мозырь' },
  // Мусорная запись с именем = только класс напряжения (точное совпадение!)
  { name: 'ВЛ-110 кВ', filialId: 3, exactName: true, comment: 'Пустая запись "ВЛ-110 кВ" Мозырь (ID=603)' },
  // ── Речица ──────────────────────────────────────────────────────────────────
  { name: 'Глуск - Бабирово',   filialId: 4, exactName: false, comment: 'ВЛ 110 кВ Глуск - Бабирово' },
  { name: 'Светлогорск220',     filialId: 4, exactName: false, comment: 'ВЛ-220 кВ Светлогорск220 - Центролит(РЭС)' },
  { name: 'СЛЭП РЭС',          filialId: 4, exactName: false, comment: 'Административная SAP-запись Речица' },
];

const VOLTAGES_TO_DELETE = [
  { name: 'ВЛ-220 кВ', filialId: 1, comment: 'Гомель -- класс ВЛ-220кВ удалён' },
];

async function deleteLineById(id) {
  const sheets = await query('SELECT ID FROM INSPECTION_SHEETS WHERE LINE_ID = ?', [id]);
  if (!DRY_RUN) {
    for (const s of sheets) {
      await execute('DELETE FROM DEFECT_RECORDS WHERE SHEET_ID = ?', [s.id]);
    }
    if (sheets.length > 0) {
      await execute('DELETE FROM INSPECTION_SHEETS WHERE LINE_ID = ?', [id]);
    }
    await execute('DELETE FROM USER_ALLOWED_LINES WHERE LINE_ID = ?', [id]).catch(() => {});
    await execute('DELETE FROM LINES WHERE ID = ?', [id]);
    console.log(`    OK (листков: ${sheets.length})`);
  } else {
    console.log(`    [dry-run] удалить + ${sheets.length} листков`);
  }
}

async function deleteByName({ name, filialId, exactName, comment }) {
  console.log(`\n[${comment}]`);
  let rows;
  if (exactName) {
    rows = await query(
      'SELECT ID, NAME, FILIAL_ID FROM LINES WHERE FILIAL_ID = ? AND NAME = ?',
      [filialId, name]
    );
  } else {
    rows = await query(
      'SELECT ID, NAME, FILIAL_ID FROM LINES WHERE FILIAL_ID = ? AND UPPER(NAME) CONTAINING UPPER(?)',
      [filialId, name]
    );
  }
  if (!rows.length) { console.log('  не найдена, пропускаем'); return; }
  for (const row of rows) {
    console.log(`  ID=${row.id}: "${row.name}"`);
    await deleteLineById(row.id);
  }
}

async function deleteVoltageByName({ name, filialId, comment }) {
  console.log(`\n[Класс: ${comment}]`);
  const voltRows = await query(
    'SELECT ID FROM VOLTAGES WHERE FILIAL_ID = ? AND UPPER(NAME) CONTAINING UPPER(?)',
    [filialId, name]
  );
  if (!voltRows.length) { console.log('  не найден, пропускаем'); return; }
  const voltId = voltRows[0].id;
  const lines  = await query('SELECT ID, NAME FROM LINES WHERE VOLTAGE_ID = ? AND FILIAL_ID = ?', [voltId, filialId]);
  console.log(`  voltageId=${voltId}, оставшихся линий: ${lines.length}`);
  for (const l of lines) {
    console.log(`  Линия ID=${l.id}: "${l.name}"`);
    await deleteLineById(l.id);
  }
  if (!DRY_RUN) {
    await execute('DELETE FROM VOLTAGES WHERE ID = ?', [voltId]);
    console.log(`  OK класс удалён`);
  } else {
    console.log(`  [dry-run] класс будет удалён`);
  }
}

async function main() {
  console.log(`Firebird: ${process.env.FB_HOST} -> ${process.env.FB_DATABASE}\n`);
  for (const line of LINES_TO_DELETE) await deleteByName(line);
  for (const v of VOLTAGES_TO_DELETE)  await deleteVoltageByName(v);
  console.log('\nГотово.');
  process.exit(0);
}

main().catch(err => { console.error('Ошибка:', err); process.exit(1); });
