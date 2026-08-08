'use strict';
// Resolve deps from server/node_modules
process.env.NODE_PATH = require('path').resolve(__dirname, '../server/node_modules');
require('module').Module._initPaths();


/**
 * export-db-to-seed.js
 *
 * Читает актуальные данные из Firebird и перезаписывает JSON seed-файлы,
 * чтобы офлайн-режим фронта соответствовал содержимому базы.
 *
 * Обновляет:
 *   server/seed/voltages.json          — все классы напряжений всех филиалов
 *   server/seed/lines.json             — все линии с кол-вом опор
 *   server/seed/filials.json           — список филиалов
 *   server/seed/filialVoltageFilter.json — фильтр напряжений по филиалу
 *
 * Использование:
 *   node scripts/export-db-to-seed.js
 */

const path = require('path');
const fs   = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const { query } = require('../server/lib/fbDb');

const SEED_DIR = path.join(__dirname, '../server/seed');

function writeJson(filename, data) {
  const fp = path.join(SEED_DIR, filename);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
  console.log(`  ✓ ${filename} — ${Array.isArray(data) ? data.length + ' записей' : 'обновлён'}`);
}

async function main() {
  console.log(`Firebird: ${process.env.FB_HOST} → ${process.env.FB_DATABASE}\n`);
  console.log('Экспортируем справочники из базы в seed-файлы...\n');

  // ── filials.json ──────────────────────────────────────────────────────────
  const filialRows = await query('SELECT ID, NAME FROM FILIALS ORDER BY ID');
  writeJson('filials.json', filialRows.map(r => ({
    id:   r.id,
    name: r.name,
  })));

  // ── voltages.json ─────────────────────────────────────────────────────────
  const voltRows = await query('SELECT ID, NAME, FILIAL_ID FROM VOLTAGES ORDER BY ID');
  writeJson('voltages.json', voltRows.map(r => ({
    id:       r.id,
    name:     r.name,
    filialId: r.filial_id,
  })));

  // ── lines.json ────────────────────────────────────────────────────────────
  const lineRows = await query(`
    SELECT ID, NAME, VOLTAGE_ID, FILIAL_ID,
           POLE_RANGE, POLE_START, POLE_END, POLE_COUNT,
           YEAR_BUILT, YEAR_LAST_OVERHAUL, LENGTH_KM,
           POLE_TYPE, WIRE_TYPE, NOTES, SAP_CODE
    FROM LINES
    ORDER BY FILIAL_ID, VOLTAGE_ID, ID
  `);
  writeJson('lines.json', lineRows.map(r => ({
    id:               r.id,
    name:             r.name,
    voltageId:        r.voltage_id   ?? null,
    filialId:         r.filial_id    ?? null,
    poleRange:        r.pole_range   ?? null,
    poleStart:        r.pole_start   ?? null,
    poleEnd:          r.pole_end     ?? null,
    poleCount:        r.pole_count   ?? null,
    yearBuilt:        r.year_built   ?? null,
    yearLastOverhaul: r.year_last_overhaul ?? null,
    lengthKm:         r.length_km != null ? Number(r.length_km) : null,
    poleType:         r.pole_type  ?? null,
    wireType:         r.wire_type  ?? null,
    notes:            r.notes      ?? null,
    sapCode:          r.sap_code   ?? null,
  })));

  // ── filialVoltageFilter.json ──────────────────────────────────────────────
  const fvfRows = await query(
    'SELECT FILIAL_ID, VOLTAGE_ID FROM FILIAL_VOLTAGE_FILTER ORDER BY FILIAL_ID, VOLTAGE_ID'
  );
  const fvf = {};
  for (const r of fvfRows) {
    const key = String(r.filial_id);
    if (!fvf[key]) fvf[key] = [];
    fvf[key].push(r.voltage_id);
  }
  writeJson('filialVoltageFilter.json', fvf);

  console.log('\nГотово. Теперь JSON-файлы соответствуют базе данных.');
  console.log('Выполни yarn build чтобы пересобрать фронт с новыми seed-данными.');

  setTimeout(() => process.exit(0), 500);
}

main().catch(err => {
  console.error('Ошибка:', err.message);
  process.exit(1);
});
