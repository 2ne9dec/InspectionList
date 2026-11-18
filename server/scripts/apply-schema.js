'use strict';

/**
 * Применяет изменения структуры и справочников к базам из server/.env.
 *
 * Скрипт идемпотентный: существующие таблицы, листки и дефекты не изменяются
 * и не удаляются. Добавляются только:
 *   - DEFECT_RECORDS.CUSTOM_NAME (nullable) — свободное описание дефекта;
 *   - ELEMENTS «Линейная арматура» (ID 31);
 *   - DEFECT_TYPES «Прочий дефект» (ID 136) для этого элемента.
 *
 * Запуск: node server/scripts/apply-schema.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { testConnection } = require('../lib/fbDb');
const { ensureSchema } = require('../lib/schema');

(async () => {
  try {
    console.log('[migrate] Проверка подключения к Firebird...');
    await testConnection();
    await ensureSchema();
    console.log('[migrate] Готово. Листки осмотра и дефекты не изменялись.');
    process.exit(0);
  } catch (err) {
    console.error('[migrate] Ошибка:', err.message);
    process.exit(1);
  }
})();
