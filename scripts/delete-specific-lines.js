'use strict';
// Resolve deps from server/node_modules
process.env.NODE_PATH = require('path').resolve(__dirname, '../server/node_modules');
require('module').Module._initPaths();

/**
 * delete-specific-lines.js
 *
 * Удаляет конкретные ошибочные линии из базы:
 *   - ВЛ 35 кВ Журавичи - Пролетарий (ID 208) — ошибка САП, не относится к филиалу
 *   - ВЛ-110 №2 Жл.Западная - Корд  (ID 241) — лишняя, 2 опоры
 *
 * Использование:
 *   node scripts/delete-specific-lines.js [--dry-run]
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const { query, execute } = require('../server/lib/fbDb');

const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) console.log('[DRY-RUN] — база не изменяется\n');

// ID линий для удаления
// 208 — ВЛ 35 кВ Журавичи - Пролетарий (ошибка САП)
// 241 — ВЛ-110 №2 Жл.Западная - Корд (2 опоры, лишняя)
// 169 — ВЛ 220 кВ Мирадино - Осиповичи (Гомель, линии уже нет)
// 429 — ВЛ-220 кВ Светлогорск220 - Центролит(РЭС) (Речица)
// 281 — ВЛ 35 кВ Пузичи - Мозырь-Ленино (Мозырь)
// 282 — ВЛ 35 кВ Нежин - Заполье (Мозырь)
// 283 — ВЛ 35 кВ Пузичи - Гоцк (Мозырь)
// 284 — ВЛ-35кВ Букча - Хильчицы (Мозырь)
// 335 — ВЛ 110 кВ Домановичи - Старобин (Мозырь)
// 336 — ВЛ 110 кВ Микашевичи-110 - Вересница (Мозырь)
// 337 — ВЛ 110 кВ Ольгомель - Вересница (Мозырь)
// 426 — ВЛ 110 кВ Глуск - Бабирово (Речица)
// 175 — ВЛ 330 кВ Белорусская - Калийная (Гомель)
// 176 — ВЛ 330 кВ Белорусская - Микашевичи (Гомель)
// 177 — ВЛ 330 кВ Белорусская - Мирадино (Гомель)
// 178 — ВЛ 330 кВ Белорусская - ТЭЦ-5 (Гомель)
// 179 — ВЛ 330 кВ Мирадино - ГРЭС-20 (Гомель)
// 180 — ВЛ 330 кВ Славутич - Чернигов (Гомель)
// 181 — ВЛ 750 кВ Белорусская - Смоленская АЭС (Гомель)
const LINE_IDS = [208, 241, 169, 429, 281, 282, 283, 284, 335, 336, 337, 426, 175, 176, 177, 178, 179, 180, 181];

// Классы напряжения для полного удаления (вместе со всеми оставшимися линиями)
// { id, name, filialId } — только для логирования
const VOLTAGE_IDS_TO_DELETE = [
  { id: 8, name: 'ВЛ-220 кВ', filialId: 1 }, // Гомель — класса нет, убираем
];

async function deleteLineById(id) {
  // Получаем название для вывода
  const rows = await query('SELECT ID, NAME, FILIAL_ID, VOLTAGE_ID, POLE_COUNT FROM LINES WHERE ID = ?', [id]);
  if (!rows.length) {
    console.log(`  ID ${id}: не найдена в базе, пропускаем`);
    return;
  }
  const line = rows[0];
  console.log(`\nЛиния ID=${line.id}: "${line.name}" (filialId=${line.filial_id}, poleCount=${line.pole_count})`);

  // Листки осмотра, связанные с этой линией
  const sheets = await query('SELECT ID FROM INSPECTION_SHEETS WHERE LINE_ID = ?', [id]);
  console.log(`  Листков осмотра: ${sheets.length}`);

  if (!DRY_RUN) {
    // Каскадное удаление дефектов → листков → прав → линии
    if (sheets.length > 0) {
      const sheetIds = sheets.map(s => s.id);

      // Удаляем дефекты связанных листков
      for (const sid of sheetIds) {
        const defects = await query('SELECT COUNT(*) AS CNT FROM DEFECT_RECORDS WHERE SHEET_ID = ?', [sid]);
        const cnt = defects[0]?.cnt ?? 0;
        if (cnt > 0) {
          await execute('DELETE FROM DEFECT_RECORDS WHERE SHEET_ID = ?', [sid]);
          console.log(`  Удалено дефектов для листка ${sid}: ${cnt}`);
        }
      }

      // Удаляем листки
      await execute('DELETE FROM INSPECTION_SHEETS WHERE LINE_ID = ?', [id]);
      console.log(`  Удалено листков: ${sheets.length}`);
    }

    // Удаляем разрешения пользователей на эту линию
    const perms = await query('SELECT COUNT(*) AS CNT FROM USER_ALLOWED_LINES WHERE LINE_ID = ?', [id]).catch(() => [{ cnt: 0 }]);
    if ((perms[0]?.cnt ?? 0) > 0) {
      await execute('DELETE FROM USER_ALLOWED_LINES WHERE LINE_ID = ?', [id]);
      console.log(`  Удалено разрешений: ${perms[0].cnt}`);
    }

    // Удаляем саму линию
    await execute('DELETE FROM LINES WHERE ID = ?', [id]);
    console.log(`  ✓ Линия ID=${id} удалена`);
  } else {
    console.log(`  [dry-run] Будет удалено: ${sheets.length} листков + дефекты + линия`);
  }
}

async function deleteVoltage({ id, name, filialId }) {
  console.log(`\nКласс напряжения ID=${id}: "${name}" (filialId=${filialId})`);

  // Оставшиеся линии под этим классом
  const remainingLines = await query('SELECT ID, NAME FROM LINES WHERE VOLTAGE_ID = ? AND FILIAL_ID = ?', [id, filialId]);
  console.log(`  Оставшихся линий: ${remainingLines.length}`);
  for (const l of remainingLines) console.log(`    - ID=${l.id}: ${l.name}`);

  if (!DRY_RUN) {
    // Каскадно удаляем оставшиеся линии
    for (const l of remainingLines) {
      await deleteLineById(l.id);
    }
    // Удаляем сам класс напряжения
    await execute('DELETE FROM VOLTAGES WHERE ID = ?', [id]);
    console.log(`  ✓ Класс напряжения ID=${id} удалён`);
  } else {
    console.log(`  [dry-run] Будет удалён класс + ${remainingLines.length} линий`);
  }
}

async function main() {
  console.log(`Firebird: ${process.env.FB_HOST} → ${process.env.FB_DATABASE}\n`);

  for (const id of LINE_IDS) {
    await deleteLineById(id);
  }

  for (const v of VOLTAGE_IDS_TO_DELETE) {
    await deleteVoltage(v);
  }

  console.log('\nГотово.');
  process.exit(0);
}

main().catch(err => {
  console.error('Ошибка:', err);
  process.exit(1);
});
