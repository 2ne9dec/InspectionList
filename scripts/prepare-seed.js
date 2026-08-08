'use strict';

/**
 * prepare-seed.js — подготавливает seed-файлы для конкретного филиала.
 *
 * Использование (перед yarn build):
 *   node scripts/prepare-seed.js 1   # Гомель
 *   node scripts/prepare-seed.js 2   # Жлобин
 *   node scripts/prepare-seed.js 3   # Мозырь
 *   node scripts/prepare-seed.js 4   # Речица
 *
 * Что делает:
 *   Копирует server/seed/{filialId}/*.json  →  server/seed/*.json
 *   Затем yarn build упакует только данные этого филиала.
 *
 * Файлы общие для всех (не перезаписываются):
 *   elements.json, defectTypes.json, phases.json,
 *   garlandElementIds.json, phaseElementIds.json, voltageGarlandCount.json
 */

const path = require('path');
const fs   = require('fs');

const FILIAL_NAMES = { 1: 'Гомель', 2: 'Жлобин', 3: 'Мозырь', 4: 'Речица' };
const PER_FILIAL_FILES = ['lines.json', 'voltages.json', 'filials.json', 'filialVoltageFilter.json'];

const filialId = Number(process.argv[2]);

if (!FILIAL_NAMES[filialId]) {
  console.error('Использование: node scripts/prepare-seed.js <filialId>');
  console.error('  filialId: 1=Гомель, 2=Жлобин, 3=Мозырь, 4=Речица');
  process.exit(1);
}

const SEED_DIR    = path.join(__dirname, '../server/seed');
const FILIAL_DIR  = path.join(SEED_DIR, String(filialId));

if (!fs.existsSync(FILIAL_DIR)) {
  console.error(`Папка не найдена: ${FILIAL_DIR}`);
  console.error('Сначала запустите: node scripts/split-db.js');
  process.exit(1);
}

console.log(`Подготовка seed-файлов для филиала ${filialId} (${FILIAL_NAMES[filialId]})...`);

for (const file of PER_FILIAL_FILES) {
  const src  = path.join(FILIAL_DIR, file);
  const dest = path.join(SEED_DIR, file);
  if (!fs.existsSync(src)) {
    console.warn(`  [WARN] Файл не найден: ${src}`);
    continue;
  }
  fs.copyFileSync(src, dest);
  const size = fs.statSync(dest).size;
  console.log(`  ${file}  (${(size / 1024).toFixed(1)} кБ)`);
}

// Обновляем VITE_FILIAL_ID в .env
const envPath = path.join(__dirname, '../.env');
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
if (/^VITE_FILIAL_ID=.*/m.test(envContent)) {
  envContent = envContent.replace(/^VITE_FILIAL_ID=.*/m, `VITE_FILIAL_ID=${filialId}`);
} else {
  envContent += `\nVITE_FILIAL_ID=${filialId}\n`;
}
fs.writeFileSync(envPath, envContent, 'utf-8');
console.log(`  .env → VITE_FILIAL_ID=${filialId}`);

console.log(`\nГотово. Теперь запустите: yarn build`);
