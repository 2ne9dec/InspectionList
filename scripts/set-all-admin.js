'use strict';
const path = require('path');
process.env.NODE_PATH = path.resolve(__dirname, '../server/node_modules');
require('module').Module._initPaths();
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });
const { query, execute } = require('../server/lib/fbDb');

async function main() {
  await execute("UPDATE USERS SET ROLE = 'admin'", []);
  const users = await query('SELECT ID, USERNAME, DISPLAY_NAME, ROLE, FILIAL_ID FROM USERS ORDER BY ID');
  console.log('Готово:');
  for (const u of users) {
    console.log(`  [${u.id}] ${u.username} / ${u.display_name} / role=${u.role} / filialId=${u.filial_id ?? 'NULL'}`);
  }
  process.exit(0);
}

main().catch(err => { console.error('[FATAL]', err.message); process.exit(1); });
