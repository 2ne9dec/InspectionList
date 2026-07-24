'use strict';

/**
 * migrate-to-firebird.js -- одноразовый перенос данных из JSON-файлов в Firebird.
 *
 * Запускать ПОСЛЕ того как выполнен firebird-schema.sql.
 *
 * Команда:
 *   cd server
 *   node migrate-to-firebird.js
 *
 * Что делает:
 *   1. Загружает справочники (filials, voltages, lines, elements, defectTypes, phases ...)
 *   2. Загружает пользователей из store/data/users.json
 *   3. Обходит все JSON-файлы листков и загружает inspectionSheets + defectRecords
 *   4. Настраивает последовательности на max(id) + 1
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const fs       = require('fs');
const Firebird = require('node-firebird');

// ── Настройки подключения ─────────────────────────────────────────────────────
const options = {
  host:           process.env.FB_HOST     || '127.0.0.1',
  port:           Number(process.env.FB_PORT || 3050),
  database:       process.env.FB_DATABASE || 'C:\\InspectionList.fdb',
  user:           process.env.FB_USER     || 'SYSDBA',
  password:       process.env.FB_PASSWORD || 'masterkey',
  lowercase_keys: false, // для миграции удобнее оригинальные имена
};

// ── Пути к исходным файлам ────────────────────────────────────────────────────
const SEED_DIR  = path.join(__dirname, 'seed');
const STORE_DIR = path.join(__dirname, 'store', 'data');
const LISTS_DIR = path.join(STORE_DIR, 'lists');

// ── Вспомогательные функции ───────────────────────────────────────────────────

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function attach() {
  return new Promise((resolve, reject) => {
    Firebird.attach(options, (err, db) => {
      if (err) return reject(err);
      resolve(db);
    });
  });
}

function dbQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) return reject(new Error(`SQL error: ${err.message}\nSQL: ${sql.slice(0, 200)}`));
      resolve(Array.isArray(result) ? result : (result ? [result] : []));
    });
  });
}

function dbExecute(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.execute(sql, params, (err, result) => {
      if (err) return reject(new Error(`SQL error: ${err.message}\nSQL: ${sql.slice(0, 200)}`));
      resolve(result);
    });
  });
}

// Обходит все .json файлы в LISTS_DIR рекурсивно
function walkLists() {
  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.endsWith('.tmp')) {
        files.push(full);
      }
    }
  }
  walk(LISTS_DIR);
  return files;
}

// Формат даты: любой -> 'YYYY-MM-DD' или null
function fmtDate(d) {
  if (!d) return null;
  const s = String(d).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

// ── Основная функция миграции ─────────────────────────────────────────────────

async function migrate() {
  console.log('=== Миграция данных в Firebird ===\n');

  const db = await attach();
  console.log('Подключение к Firebird: OK\n');

  let totalSheets  = 0;
  let totalDefects = 0;

  try {
    // ── 1. Справочники ──────────────────────────────────────────────────────────
    console.log('1. Загрузка справочников...');

    const filials = readJson(path.join(SEED_DIR, 'filials.json')) ?? [];
    for (const r of filials) {
      await dbExecute(db,
        'UPDATE OR INSERT INTO FILIALS (ID, NAME) VALUES (?, ?) MATCHING (ID)',
        [r.id, r.name],
      );
    }
    console.log(`   Филиалы: ${filials.length}`);

    const voltages = readJson(path.join(SEED_DIR, 'voltages.json')) ?? [];
    for (const r of voltages) {
      await dbExecute(db,
        'UPDATE OR INSERT INTO VOLTAGES (ID, NAME, FILIAL_ID) VALUES (?, ?, ?) MATCHING (ID)',
        [r.id, r.name, r.filialId ?? null],
      );
    }
    console.log(`   Напряжения: ${voltages.length}`);

    const lines = readJson(path.join(SEED_DIR, 'lines.json')) ?? [];
    for (const r of lines) {
      await dbExecute(db,
        `UPDATE OR INSERT INTO LINES
           (ID, NAME, VOLTAGE_ID, FILIAL_ID, POLE_RANGE, POLE_START, POLE_END,
            POLE_COUNT, YEAR_BUILT, YEAR_LAST_OVERHAUL, LENGTH_KM, POLE_TYPE, WIRE_TYPE, NOTES)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) MATCHING (ID)`,
        [r.id, r.name,
         r.voltageId ?? null, r.filialId ?? null,
         r.poleRange ?? null, r.poleStart ?? null, r.poleEnd ?? null,
         r.poleCount ?? null, r.yearBuilt ?? null, r.yearLastOverhaul ?? null,
         r.lengthKm  != null ? Number(r.lengthKm) : null,
         r.poleType  ?? null, r.wireType  ?? null, r.notes ?? null],
      );
    }
    console.log(`   Линии: ${lines.length}`);

    const elements = readJson(path.join(SEED_DIR, 'elements.json')) ?? [];
    for (const r of elements) {
      await dbExecute(db,
        'UPDATE OR INSERT INTO ELEMENTS (ID, NAME) VALUES (?, ?) MATCHING (ID)',
        [r.id, r.name],
      );
    }
    console.log(`   Элементы: ${elements.length}`);

    const defectTypes = readJson(path.join(SEED_DIR, 'defectTypes.json')) ?? [];
    for (const r of defectTypes) {
      await dbExecute(db,
        'UPDATE OR INSERT INTO DEFECT_TYPES (ID, NAME, SEVERITY, ELEMENT_ID) VALUES (?,?,?,?) MATCHING (ID)',
        [r.id, r.name, r.severity ?? null, r.elementId ?? null],
      );
    }
    console.log(`   Типы дефектов: ${defectTypes.length}`);

    const phases = readJson(path.join(SEED_DIR, 'phases.json')) ?? [];
    for (const r of phases) {
      await dbExecute(db,
        'UPDATE OR INSERT INTO PHASES (ID, NAME) VALUES (?,?) MATCHING (ID)',
        [r.id, r.name],
      );
    }
    console.log(`   Фазы: ${phases.length}`);

    const phaseElem = readJson(path.join(SEED_DIR, 'phaseElementIds.json')) ?? [];
    for (const r of phaseElem) {
      const phaseId = r.phaseId ?? r.phase_id;
      const elemId  = r.elementId ?? r.element_id;
      if (!phaseId || !elemId) continue;
      await dbExecute(db,
        'UPDATE OR INSERT INTO PHASE_ELEMENT_IDS (PHASE_ID, ELEMENT_ID) VALUES (?,?) MATCHING (PHASE_ID, ELEMENT_ID)',
        [phaseId, elemId],
      );
    }
    console.log(`   PhaseElementIds: ${phaseElem.length}`);

    // filialVoltageFilter может быть объектом { "2": [1,2,4] } или массивом
    const fvfRaw = readJson(path.join(SEED_DIR, 'filialVoltageFilter.json')) ?? {};
    const fvfPairs = [];
    if (Array.isArray(fvfRaw)) {
      fvfRaw.forEach(r => fvfPairs.push([r.filialId, r.voltageId]));
    } else {
      for (const [fid, vids] of Object.entries(fvfRaw)) {
        const voltageIds = Array.isArray(vids) ? vids : [vids];
        voltageIds.forEach(vid => fvfPairs.push([Number(fid), Number(vid)]));
      }
    }
    for (const [fid, vid] of fvfPairs) {
      await dbExecute(db,
        'UPDATE OR INSERT INTO FILIAL_VOLTAGE_FILTER (FILIAL_ID, VOLTAGE_ID) VALUES (?,?) MATCHING (FILIAL_ID, VOLTAGE_ID)',
        [fid, vid],
      );
    }
    console.log(`   FilialVoltageFilter: ${fvfPairs.length}\n`);

    // ── 2. Пользователи ─────────────────────────────────────────────────────────
    console.log('2. Загрузка пользователей...');
    const users = readJson(path.join(STORE_DIR, 'users.json')) ?? [];
    for (const u of users) {
      await dbExecute(db,
        `UPDATE OR INSERT INTO USERS (ID, USERNAME, PASSWORD, DISPLAY_NAME, ROLE, FILIAL_ID)
         VALUES (?,?,?,?,?,?) MATCHING (ID)`,
        [String(u.id), u.username, u.password,
         u.displayName ?? u.username, u.role ?? 'viewer',
         u.filialId != null ? Number(u.filialId) : null],
      );

      if (Array.isArray(u.allowedLineIds)) {
        await dbExecute(db, 'DELETE FROM USER_ALLOWED_LINES WHERE USER_ID = ?', [String(u.id)]);
        for (const lid of u.allowedLineIds) {
          await dbExecute(db,
            'INSERT INTO USER_ALLOWED_LINES (USER_ID, LINE_ID) VALUES (?,?)',
            [String(u.id), Number(lid)],
          );
        }
      }

      if (Array.isArray(u.allowedVoltageIds)) {
        await dbExecute(db, 'DELETE FROM USER_ALLOWED_VOLTAGES WHERE USER_ID = ?', [String(u.id)]);
        for (const vid of u.allowedVoltageIds) {
          await dbExecute(db,
            'INSERT INTO USER_ALLOWED_VOLTAGES (USER_ID, VOLTAGE_ID) VALUES (?,?)',
            [String(u.id), Number(vid)],
          );
        }
      }
    }
    console.log(`   Пользователи: ${users.length}\n`);

    // ── 3. Листки осмотра и дефекты ─────────────────────────────────────────────
    console.log('3. Загрузка листков осмотра и дефектов...');
    const listFiles = walkLists();
    console.log(`   Найдено файлов: ${listFiles.length}`);

    let maxSheetId  = 0;
    let maxDefectId = 0;

    for (const fp of listFiles) {
      let data;
      try {
        data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      } catch {
        console.warn(`   ПРОПУЩЕН (ошибка чтения): ${path.basename(fp)}`);
        continue;
      }

      const sheetsInFile  = data.inspectionSheets  ?? [];
      const defectsInFile = data.defectRecords      ?? [];

      for (const s of sheetsInFile) {
        if (!s.id) continue;
        await dbExecute(db,
          `UPDATE OR INSERT INTO INSPECTION_SHEETS
             (ID, FILIAL_ID, VOLTAGE_ID, LINE_ID, CREATED_BY, CREATED_DATE, STATUS, NOTES)
           VALUES (?,?,?,?,?,CAST(? AS DATE),?,?) MATCHING (ID)`,
          [s.id, s.filialId ?? null, s.voltageId ?? null, s.lineId ?? null,
           s.createdBy ?? null, fmtDate(s.createdDate),
           s.status ?? 'active', s.notes ?? null],
        );
        if (s.id > maxSheetId) maxSheetId = s.id;
        totalSheets++;
      }

      // Для дефектов нам нужен lineId - берём из листка
      const sheetLineMap = {};
      for (const s of sheetsInFile) {
        if (s.id) sheetLineMap[s.id] = s.lineId;
      }

      for (const d of defectsInFile) {
        if (!d.id) continue;
        const lineId = d.lineId ?? sheetLineMap[d.sheetId] ?? null;
        await dbExecute(db,
          `UPDATE OR INSERT INTO DEFECT_RECORDS
             (ID, SHEET_ID, LINE_ID, POLE_NUMBER, DEFECT_ID, PHASE_ID, ELEMENT_ID,
              DATE_FOUND, INSPECTOR_FIND, IS_FIXED, DATE_FIXED, INSPECTOR_FIX,
              INSULATOR_COUNT, SPAN_RANGE, NOTES, STATUS,
              MASTER_CONCLUSION, RESOLUTION_DEADLINE, MASTER_NAME, FIX_WORK_VOLUME)
           VALUES (?,?,?,?,?,?,?,
                   CAST(? AS DATE),?,?,CAST(? AS DATE),?,
                   ?,?,?,?,
                   ?,CAST(? AS DATE),?,?)
           MATCHING (ID)`,
          [d.id, d.sheetId ?? null, lineId,
           d.poleNumber ?? null, d.defectId ?? null,
           d.phaseId    ?? null, d.elementId ?? null,
           fmtDate(d.dateFound), d.inspectorFind ?? null,
           d.isFixed ? 1 : 0,
           fmtDate(d.dateFixed), d.inspectorFix ?? null,
           d.insulatorCount ?? null, d.spanRange ?? null,
           d.notes    ?? null, d.status ?? null,
           d.masterConclusion   ?? null,
           fmtDate(d.resolutionDeadline),
           d.masterName      ?? null,
           d.fixWorkVolume   ?? null],
        );
        if (d.id > maxDefectId) maxDefectId = d.id;
        totalDefects++;
      }
    }

    console.log(`   Листков осмотра: ${totalSheets}`);
    console.log(`   Записей дефектов: ${totalDefects}\n`);

    // ── 4. Настройка последовательностей ────────────────────────────────────────
    console.log('4. Настройка последовательностей...');
    if (maxSheetId > 0) {
      await dbExecute(db, `ALTER SEQUENCE GEN_SHEETS_ID RESTART WITH ${maxSheetId + 1}`);
      console.log(`   GEN_SHEETS_ID -> ${maxSheetId + 1}`);
    }
    if (maxDefectId > 0) {
      await dbExecute(db, `ALTER SEQUENCE GEN_DEFECTS_ID RESTART WITH ${maxDefectId + 1}`);
      console.log(`   GEN_DEFECTS_ID -> ${maxDefectId + 1}`);
    }

    console.log('\n=== Миграция завершена успешно! ===');
    console.log('\nСледующий шаг:');
    console.log('  1. Скопируй server/.env.example в server/.env');
    console.log('  2. Заполни настройки Firebird в .env');
    console.log('  3. Запусти сервер: node server/index.js');
  } finally {
    db.detach();
  }
}

migrate().catch(err => {
  console.error('\n[ERROR]', err.message);
  process.exit(1);
});
