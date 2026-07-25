'use strict';
/**
 * set-all-admin.js
 * Устанавливает роль 'admin' всем пользователям в таблице USERS.
 * Запуск: node server/set-all-admin.js
 * После использования удалите этот файл.
 */
try { require('dotenv').config({ path: require('path').join(__dirname, '.env') }); } catch {}

const { query, execute } = require('./lib/fbDb');

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
