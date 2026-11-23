#!/usr/bin/env node
/**
 * Копирует справочники из server/seed в src/shared/config/reference.
 * Фронтенд не импортирует server/seed напрямую (FSD), но данные остаются
 * единым источником: после изменения seed запустите yarn reference:sync.
 */

import fs from 'node:fs';
import path from 'node:path';

const FILES = [
  'filials.json',
  'voltages.json',
  'lines.json',
  'filialVoltageFilter.json',
  'elements.json',
  'defectTypes.json',
  'phases.json',
  'phaseElementIds.json',
  'garlandElementIds.json',
  'voltageGarlandCount.json',
];

const src = path.resolve('server/seed');
const dst = path.resolve('src/shared/config/reference');

fs.mkdirSync(dst, { recursive: true });

for (const file of FILES) {
  const from = path.join(src, file);
  const to = path.join(dst, file);
  fs.copyFileSync(from, to);
  console.log('[reference] Done.');
}

console.log('[reference] Done.');
