'use strict';
// Resolve deps from server/node_modules
process.env.NODE_PATH = require('path').resolve(__dirname, '../server/node_modules');
require('module').Module._initPaths();


/**
 * import-sap-lines.js
 *
 * Импортирует линии электропередачи из Excel-экспорта SAP Logon в Firebird.
 *
 * Использование:
 *   node scripts/import-sap-lines.js --file="C:\export\sap_lines.xlsx" [--dry-run] [--sheet=0]
 *
 * Опции:
 *   --file=<path>   Путь к Excel-файлу (обязательно)
 *   --sheet=<N|name> Индекс или имя листа (по умолчанию: 0)
 *   --dry-run       Только показать, что будет импортировано (БД не трогать)
 *   --filial-id=<N> Принудительно задать ID филиала для всех строк
 *
 * Ожидаемые колонки Excel (регистр не важен, ищем по подстрокам):
 *   Филиал / Filial / Branch     → FILIALS.NAME
 *   Напряжение / Voltage / кВ    → VOLTAGES.NAME  (например "110 кВ")
 *   Линия / Наименование / Name  → LINES.NAME
 *   Опор / Poles / Pole count    → LINES.POLE_COUNT
 *   Нач. опора / Pole start      → LINES.POLE_START  (необязательно)
 *   Кон. опора / Pole end        → LINES.POLE_END    (необязательно)
 *   Год постр. / Year built      → LINES.YEAR_BUILT  (необязательно)
 *   Год рем.   / Year overhaul   → LINES.YEAR_LAST_OVERHAUL (необязательно)
 *
 * Алгоритм:
 *   1. Читаем Excel → массив строк
 *   2. Для каждого уникального филиала:
 *        UPDATE OR INSERT INTO FILIALS → получаем filialId
 *   3. Для каждого уникального (филиал, напряжение):
 *        UPDATE OR INSERT INTO VOLTAGES → получаем voltageId
 *   4. Для каждой строки линии:
 *        UPDATE OR INSERT INTO LINES по (NAME, FILIAL_ID, VOLTAGE_ID)
 *   5. Если --dry-run — только печатаем, не пишем в БД.
 */

const path   = require('path');
const fs     = require('fs');

// ── Аргументы командной строки ───────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  })
);

const EXCEL_FILE  = args['file'];
const DRY_RUN     = args['dry-run'] === true || args['dry-run'] === 'true';
const SHEET_ARG   = args['sheet'] ?? 0;
const FORCED_FID  = args['filial-id'] ? Number(args['filial-id']) : null;

if (!EXCEL_FILE) {
  console.error('Укажите путь к файлу: --file=path/to/sap_lines.xlsx');
  process.exit(1);
}
if (!fs.existsSync(EXCEL_FILE)) {
  console.error('Файл не найден:', EXCEL_FILE);
  process.exit(1);
}

// ── Загружаем xlsx ───────────────────────────────────────────────────────────
let XLSX;
try {
  XLSX = require('xlsx');
} catch {
  console.error('Не установлен пакет xlsx. Выполните: npm install xlsx');
  process.exit(1);
}

// ── Загружаем Firebird-клиент (из проекта) ───────────────────────────────────
// Загружаем .env для DATABASE_URL / FIREBIRD_* переменных
try { require('dotenv').config({ path: path.join(__dirname, '../server/.env') }); } catch {}

const { query, execute, transaction } = require('../server/lib/fbDb');

// ─────────────────────────────────────────────────────────────────────────────
// Утилиты определения колонок
// ─────────────────────────────────────────────────────────────────────────────
const COLUMN_PATTERNS = {
  filial:    [/филиал/i, /filial/i, /branch/i, /регион/i],
  voltage:   [/напряжен/i, /voltage/i, /класс/i, /кв\b/i, /кВ\b/],
  name:      [/наименован/i, /линия/i, /name/i, /line/i, /объект/i],
  poleCount: [/кол.*опор/i, /опор/i, /pole.?count/i, /poles/i, /кол-во/i],
  poleStart: [/нач.*опора/i, /нач\./i, /pole.?start/i, /from.?pole/i],
  poleEnd:   [/кон.*опора/i, /кон\./i, /pole.?end/i, /to.?pole/i],
  yearBuilt: [/год.*пост/i, /год.*стр/i, /year.?built/i, /построен/i],
  yearOverhaul: [/год.*рем/i, /year.?overhaul/i, /капремонт/i],
};

function detectColumns(headers) {
  const map = {};
  for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
    for (let i = 0; i < headers.length; i++) {
      const h = String(headers[i] ?? '').trim();
      if (patterns.some(p => p.test(h))) {
        map[field] = i;
        break;
      }
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// Читаем Excel
// ─────────────────────────────────────────────────────────────────────────────
function readExcel(filePath, sheetArg) {
  const wb = XLSX.readFile(filePath, { cellDates: true, raw: false });
  const sheetName = isNaN(Number(sheetArg))
    ? sheetArg
    : wb.SheetNames[Number(sheetArg)] ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.error('Лист не найден:', sheetArg, '| Доступные:', wb.SheetNames.join(', '));
    process.exit(1);
  }
  console.log(`Читаю лист: "${sheetName}"`);
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Нормализация напряжения: "110 кВ" → "110 кВ" (убираем мусор)
// ─────────────────────────────────────────────────────────────────────────────
function normalizeVoltage(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  // Если уже содержит кВ — нормализуем пробелы
  const m = s.match(/(\d+)\s*кВ/i);
  if (m) return `${m[1]} кВ`;
  // Если просто число — добавляем кВ
  if (/^\d+$/.test(s)) return `${s} кВ`;
  return s;
}

function str(v) { return v == null ? null : String(v).trim() || null; }
function num(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^\d.,-]/g, '').replace(',', '.'));
  return isNaN(n) ? null : Math.round(n);
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── Вспомогательные функции UPSERT для Firebird ────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Нет MERGE в старых версиях Firebird — используем SELECT + INSERT/UPDATE

async function upsertFilial(name) {
  const rows = await query('SELECT ID FROM FILIALS WHERE UPPER(NAME) = UPPER(?)', [name]);
  if (rows.length) return rows[0].id;
  // Новый ID — max+1
  const mx = await query('SELECT MAX(ID) AS M FROM FILIALS', []);
  const newId = (mx[0].m ?? 0) + 1;
  await execute('INSERT INTO FILIALS (ID, NAME) VALUES (?, ?)', [newId, name]);
  return newId;
}

async function upsertVoltage(name, filialId) {
  const rows = await query(
    'SELECT ID FROM VOLTAGES WHERE UPPER(NAME) = UPPER(?) AND FILIAL_ID = ?',
    [name, filialId]
  );
  if (rows.length) return rows[0].id;
  const mx = await query('SELECT MAX(ID) AS M FROM VOLTAGES', []);
  const newId = (mx[0].m ?? 0) + 1;
  await execute(
    'INSERT INTO VOLTAGES (ID, NAME, FILIAL_ID) VALUES (?, ?, ?)',
    [newId, name, filialId]
  );
  return newId;
}

async function upsertLine(line) {
  const { name, voltageId, filialId, poleCount, poleStart, poleEnd, yearBuilt, yearOverhaul } = line;
  const rows = await query(
    'SELECT ID FROM LINES WHERE UPPER(NAME)=UPPER(?) AND FILIAL_ID=? AND VOLTAGE_ID=?',
    [name, filialId, voltageId]
  );
  if (rows.length) {
    // Обновляем поля, если они есть
    const id = rows[0].id;
    await execute(
      `UPDATE LINES SET
        POLE_COUNT = COALESCE(?, POLE_COUNT),
        POLE_START = COALESCE(?, POLE_START),
        POLE_END   = COALESCE(?, POLE_END),
        YEAR_BUILT = COALESCE(?, YEAR_BUILT),
        YEAR_LAST_OVERHAUL = COALESCE(?, YEAR_LAST_OVERHAUL)
       WHERE ID = ?`,
      [poleCount, poleStart, poleEnd, yearBuilt, yearOverhaul, id]
    );
    return { id, action: 'updated' };
  }
  const mx = await query('SELECT MAX(ID) AS M FROM LINES', []);
  const newId = (mx[0].m ?? 0) + 1;
  await execute(
    `INSERT INTO LINES
      (ID, NAME, VOLTAGE_ID, FILIAL_ID, POLE_COUNT, POLE_START, POLE_END, YEAR_BUILT, YEAR_LAST_OVERHAUL)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [newId, name, voltageId, filialId, poleCount, poleStart, poleEnd, yearBuilt, yearOverhaul]
  );
  return { id: newId, action: 'inserted' };
}

// ─────────────────────────────────────────────────────────────────────────────
// ─── ОСНОВНАЯ ФУНКЦИЯ ─────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '=== РЕЖИМ DRY-RUN (БД не изменяется) ===' : '=== ИМПОРТ SAP ЛИНИЙ ===');
  console.log('Файл:', EXCEL_FILE);

  // 1. Читаем Excel
  const rows = readExcel(EXCEL_FILE, SHEET_ARG);
  if (rows.length < 2) { console.error('Файл пуст или содержит только заголовок'); process.exit(1); }

  const headers = rows[0].map(h => String(h ?? '').trim());
  const colMap  = detectColumns(headers);

  console.log('\nОпределённые колонки:');
  for (const [field, idx] of Object.entries(colMap)) {
    console.log(`  ${field.padEnd(14)} → "${headers[idx]}" (col ${idx})`);
  }

  if (!colMap.name) {
    console.error('\nНе найдена колонка с названием линии. Проверьте заголовки Excel.');
    process.exit(1);
  }

  // 2. Парсим строки
  const dataRows = rows.slice(1);
  const lines = [];
  for (const row of dataRows) {
    const name = str(row[colMap.name]);
    if (!name) continue; // пустая строка

    lines.push({
      filialRaw:    FORCED_FID ? null : str(colMap.filial  != null ? row[colMap.filial]  : null),
      voltageRaw:   normalizeVoltage(colMap.voltage != null ? row[colMap.voltage] : null),
      name,
      poleCount:    num(colMap.poleCount != null ? row[colMap.poleCount]  : null),
      poleStart:    num(colMap.poleStart != null ? row[colMap.poleStart]  : null),
      poleEnd:      num(colMap.poleEnd   != null ? row[colMap.poleEnd]    : null),
      yearBuilt:    num(colMap.yearBuilt != null ? row[colMap.yearBuilt]  : null),
      yearOverhaul: num(colMap.yearOverhaul != null ? row[colMap.yearOverhaul] : null),
    });
  }

  console.log(`\nСтрок данных: ${lines.length}`);

  if (DRY_RUN) {
    // Только печатаем первые 20
    const preview = lines.slice(0, 20);
    console.log('\nПредпросмотр (первые 20 строк):');
    console.log('ФИЛИАЛ'.padEnd(20), 'НАПРЯЖЕНИЕ'.padEnd(12), 'ЛИНИЯ'.padEnd(40), 'ОП.');
    console.log('─'.repeat(90));
    for (const l of preview) {
      console.log(
        (l.filialRaw ?? `filialId=${FORCED_FID}`).padEnd(20),
        (l.voltageRaw ?? '—').padEnd(12),
        l.name.padEnd(40),
        l.poleCount ?? '—'
      );
    }
    if (lines.length > 20) console.log(`... и ещё ${lines.length - 20} строк`);
    console.log('\nDry-run завершён. Запустите без --dry-run для реального импорта.');
    process.exit(0);
  }

  // 3. Импорт в БД
  const filialCache  = new Map(); // имя филиала → id
  const voltageCache = new Map(); // `${filialId}::${voltName}` → id (кэш напряжений)

  let inserted = 0, updated = 0, skipped = 0;

  for (const l of lines) {
    try {
      // Филиал
      let filialId = FORCED_FID;
      if (!filialId) {
        if (!l.filialRaw) { console.warn(`[SKIP] Нет филиала: "${l.name}"`); skipped++; continue; }
        if (!filialCache.has(l.filialRaw)) {
          filialCache.set(l.filialRaw, await upsertFilial(l.filialRaw));
        }
        filialId = filialCache.get(l.filialRaw);
      }

      // Напряжение
      let voltageId = null;
      if (l.voltageRaw) {
        const vkey = `${filialId}::${l.voltageRaw}`;
        if (!voltageCache.has(vkey)) {
          voltageCache.set(vkey, await upsertVoltage(l.voltageRaw, filialId));
        }
        voltageId = voltageCache.get(vkey);
      } else {
        // Пытаемся взять первое доступное напряжение для этого филиала
        const rows = await query('SELECT ID FROM VOLTAGES WHERE FILIAL_ID = ? ROWS 1', [filialId]);
        if (rows.length) voltageId = rows[0].id;
        else { console.warn(`[SKIP] Нет напряжения для линии: "${l.name}"`); skipped++; continue; }
      }

      // Линия
      const result = await upsertLine({ ...l, filialId, voltageId });
      if (result.action === 'inserted') {
        inserted++;
        console.log(`[+] ${l.name} (ID=${result.id})`);
      } else {
        updated++;
        console.log(`[~] ${l.name} (ID=${result.id}) обновлено`);
      }
    } catch (e) {
      console.error(`[ERROR] "${l.name}": ${e.message}`);
      skipped++;
    }
  }

  console.log('\n── Итог ──────────────────────────────────');
  console.log(`  Добавлено:  ${inserted}`);
  console.log(`  Обновлено:  ${updated}`);
  console.log(`  Пропущено:  ${skipped}`);
  console.log(`  Всего:      ${lines.length}`);
  process.exit(0);
}

main().catch(e => { console.error('Критическая ошибка:', e); process.exit(1); });
