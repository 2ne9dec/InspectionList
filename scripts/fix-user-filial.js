'use strict';
const path = require('path');
process.env.NODE_PATH = path.resolve(__dirname, '../server/node_modules');
require('module').Module._initPaths();
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const { query, execute } = require('../server/lib/fbDb');

async function main() {
  // Показываем всех пользователей
  const users = await query(
    `SELECT ID, USERNAME, DISPLAY_NAME, ROLE, FILIAL_ID FROM USERS ORDER BY ID`
  );
  console.log('\nПользователи:');
  for (const u of users) {
    console.log(`  [${u.id}] ${u.username} / ${u.display_name} / role=${u.role} / filialId=${u.filial_id ?? 'NULL'}`);
  }

  // Обновляем пользователей у которых FILIAL_ID = NULL и role != 'admin'
  // (они должны быть привязаны к конкретному филиалу)
  // ЗАКОММЕНТИРУЙ эту секцию если нужно обновить вручную

  /*
  const TARGET_USERNAME = 'zhlobin';  // замени на реальный username
  const TARGET_FILIAL_ID = 2;          // Жлобинские ЭС
  await execute(
    'UPDATE USERS SET FILIAL_ID = ? WHERE USERNAME = ?',
    [TARGET_FILIAL_ID, TARGET_USERNAME]
  );
  console.log(`\nОбновлён: ${TARGET_USERNAME} -> filialId=${TARGET_FILIAL_ID}`);
  */

  process.exit(0);
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
