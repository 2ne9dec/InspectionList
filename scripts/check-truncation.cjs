/**
 * check-truncation.cjs
 *
 * Проверяет исходные файлы src/ на признаки обрезания (truncation bug).
 *
 * Симптом: Edit tool + Windows CRLF + Cyrillic UTF-8 — файл сохраняется
 * частично, обрывается на произвольном байте внутри многобайтового символа.
 *
 * Проверяет:
 *  1. Файл заканчивается на \n (иначе вероятно обрезан).
 *  2. Последние 64 байта — валидный UTF-8 (нет незакрытых многобайтных последовательностей).
 *  3. Общая валидность UTF-8 (полный файл).
 *
 * Выводит список проблемных файлов. Возвращает exit code 1 при ошибках.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// Расширения файлов для проверки
const EXTENSIONS = new Set(['.ts', '.tsx', '.scss', '.js', '.cjs', '.mjs']);

// Корень проекта
const ROOT = path.resolve(__dirname, '..');
const SRC  = path.join(ROOT, 'src');

// ── Утилиты ─────────────────────────────────────────────────────────────────

/** Рекурсивно обходит директорию, возвращает список файлов */
function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Проверяет, является ли буфер валидным UTF-8.
 * Возвращает null если OK, или описание ошибки.
 */
function validateUtf8(buf) {
  let i = 0;
  while (i < buf.length) {
    const b = buf[i];
    let extra = 0;
    if ((b & 0x80) === 0x00) {
      extra = 0; // ASCII
    } else if ((b & 0xE0) === 0xC0) {
      extra = 1;
    } else if ((b & 0xF0) === 0xE0) {
      extra = 2;
    } else if ((b & 0xF8) === 0xF0) {
      extra = 3;
    } else {
      return `невалидный стартовый байт 0x${b.toString(16)} на позиции ${i}`;
    }
    i++;
    for (let j = 0; j < extra; j++, i++) {
      if (i >= buf.length) {
        return `незакрытая UTF-8 последовательность в конце файла (ждали ${extra - j} continuation байт)`;
      }
      if ((buf[i] & 0xC0) !== 0x80) {
        return `неожиданный байт 0x${buf[i].toString(16)} на позиции ${i} (ожидался continuation байт)`;
      }
    }
  }
  return null;
}

// ── Основная логика ──────────────────────────────────────────────────────────

const files  = walk(SRC);
const errors = [];

for (const filePath of files) {
  const buf = fs.readFileSync(filePath);

  // 1. Пустой файл — ок
  if (buf.length === 0) continue;

  // 2. Файл должен заканчиваться на \n (LF или CRLF)
  const lastByte = buf[buf.length - 1];
  if (lastByte !== 0x0A) {
    errors.push({
      file: path.relative(ROOT, filePath),
      reason: `не заканчивается на \\n (последний байт: 0x${lastByte.toString(16)})`,
    });
    continue; // дальше не проверяем — файл скорее всего обрезан
  }

  // 3. Валидность UTF-8
  const utf8err = validateUtf8(buf);
  if (utf8err) {
    errors.push({
      file: path.relative(ROOT, filePath),
      reason: utf8err,
    });
  }
}

// ── Вывод ────────────────────────────────────────────────────────────────────

if (errors.length === 0) {
  console.log(`✓ check-truncation: проверено ${files.length} файлов, обрезанных нет`);
  process.exit(0);
} else {
  console.error(`\n✗ check-truncation: найдено ${errors.length} проблемных файл(ов):\n`);
  for (const e of errors) {
    console.error(`  ${e.file}\n    → ${e.reason}\n`);
  }
  process.exit(1);
}
