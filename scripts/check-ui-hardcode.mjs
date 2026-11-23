#!/usr/bin/env node
/**
 * Контроль UI-хардкода.
 *
 * Проверяет:
 *  - hex/rgb/rgba в SCSS-компонентах (цвета — только в tokens/themes/print);
 *  - px/rem в типографике и отступах (font-size, line-height, letter-spacing,
 *    gap, padding, margin, border-radius);
 *  - литеральные z-index и transition-длительности;
 *  - литеральные @media (кроме mixins);
 *  - inline-стили с цветами/px в TSX;
 *  - <img>/внешние URL для иконок.
 *
 * Запуск: node scripts/check-ui-hardcode.mjs
 * В CI: yarn check:hardcode (входит в check:all).
 */

import fs from 'node:fs';
import path from 'node:path';

const SRC = 'src';
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'deploy']);

const isTokenLayer = (file) =>
  file.includes('/shared/styles/tokens/') ||
  file.includes('/shared/styles/themes/') ||
  file.includes('/shared/styles/mixins/') ||
  file.includes('/shared/styles/print/');

function walk(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else result.push(full.replace(/\\/g, '/'));
  }
  return result;
}

const files = walk(SRC);
const scss = files.filter((f) => f.endsWith('.scss') && !isTokenLayer(f));
const tsx = files.filter((f) => f.endsWith('.tsx'));
const all = files.filter((f) => /\.(scss|ts|tsx)$/.test(f));

const issues = [];
const info = {
  pxTotal: 0,
  inlineStyles: 0,
};

const add = (file, line, rule, text) => {
  issues.push({ file, line, rule, text: text.trim() });
};

for (const file of all) {
  // Токены, темы и print — единственное место, где допустимы сырые значения.
  if (file.endsWith('.scss') && isTokenLayer(file)) continue;

  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');

  lines.forEach((line, idx) => {
    const n = idx + 1;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) return;

    if (file.endsWith('.scss')) {
      // Разрешаем print-слой и токены (они отфильтрованы выше).
      if (/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(line)) {
        add(file, n, 'scss-color', trimmed);
      }

      if (
        /(?:font-size|line-height|letter-spacing|gap|row-gap|column-gap|padding|padding-[a-z]+|margin|margin-[a-z]+|border-radius)\s*:[^;]*\d+(?:\.\d+)?(?:px|rem|em)\b/.test(line)
      ) {
        add(file, n, 'scss-unit', trimmed);
      }

      if (/\bz-index\s*:\s*\d+\s*;/.test(line)) {
        add(file, n, 'scss-z-index', trimmed);
      }

      if (/\btransition\s*:[^;]*\b0?\.\d+s\b/.test(line) && !/5000s/.test(line)) {
        add(file, n, 'scss-transition', trimmed);
      }

      if (
        /@media\b/.test(line) &&
        !file.includes('/shared/styles/mixins/') &&
        !file.endsWith('/shared/styles/_reset.scss')
      ) {
        add(file, n, 'scss-media', trimmed);
      }

      info.pxTotal += (line.match(/(?<![\w-])\d+(?:\.\d+)?px\b/g) || []).length;
    }

    if (file.endsWith('.tsx')) {
      if (line.includes('style={{')) info.inlineStyles += 1;

      if (/<img\b/i.test(line)) {
        add(file, n, 'tsx-img', trimmed);
      }

      if (/https?:\/\/[^'"\s]+\.(?:svg|png|jpe?g|webp)/i.test(line)) {
        add(file, n, 'tsx-external-image', trimmed);
      }
    }
  });

  // Inline-стили: ищем цвет/px внутри блока style={{ ... }} без сложного парсера.
  if (file.endsWith('.tsx')) {
    const inlineMatches = text.matchAll(/style=\{\{([\s\S]{0,400}?)\}\}/g);
    for (const match of inlineMatches) {
      if (/#[0-9a-fA-F]{3,8}\b|rgba?\(|\d+px/.test(match[1])) {
        const line = text.slice(0, match.index).split('\n').length;
        add(file, line, 'tsx-inline-hardcode', match[0].slice(0, 160));
      }
    }
  }
}

if (issues.length > 0) {
  console.error('\n[check:hardcode] Found hardcoded values:\n');
  for (const issue of issues) {
    console.error(`${issue.file}:${issue.line}  [${issue.rule}]  ${issue.text}`);
  }
  console.error(`\nTotal: ${issues.length}. See the audit report for details.`);
  process.exit(1);
}

console.log('[check:hardcode] OK');
console.log(`  px outside tokens (width/height etc.) - ${info.pxTotal}`);
console.log(`  inline styles in TSX - ${info.inlineStyles} (dynamic/positioning)`);
