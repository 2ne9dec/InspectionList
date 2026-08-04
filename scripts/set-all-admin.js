'use strict';
// Resolve deps from server/node_modules
process.env.NODE_PATH = require('path').resolve(__dirname, '../server/node_modules');
require('module').Module._initPaths();

/**
 * set-all-admin.js
 * Устанавливает роль 'admin' всем пользователям в таблице USERS.
 * Запуск: node scripts/set-all-admin.js
 * После использования удалите этот файл.
 */
try { require('dotenv').config({ path: require('path').join(__dirname, '../server/.env') }); } catch {}

const { query, execute } = require('../server/lib/fbDb');

async function main() {
  const users = await query('SELECT ID, USERNAME, ROLE FROM USERS ORDER BY ID');
  console.log(`\nПользователей в базе: ${users.length}`);
  console.log('─'.repeat(50));

  for (const u of users) {
    console.log(`  [${u.id}] ${u.username}  роль: ${u.role ?? '(null)'}  → admin`);
  }

  console.log('\nОбновляю...');
  await execute("UPDATE USERS SET ROLE = 'admin'");

  const after = await query('SELECT ID, USERNAME, ROLE FROM USERS ORDER BY ID');
  console.log('\nРезультат:');
  for (const u of after) {
    console.log(`  [${u.id}] ${u.username}  роль: ${u.role}`);
  }

  console.log('\nГотово. Пользователи должны заново войти в систему (новый JWT с ролью admin).');
  process.exit(0);
}

main().catch(e => { console.error('Ошибка:', e.message); process.exit(1); });
