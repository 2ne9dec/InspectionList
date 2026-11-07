'use strict';

/**
 * permissions.js — права ролей.
 *
 * Администратор системы в админ-панели задаёт, что может каждая роль
 * (руководитель, инженер, мастер, пользователь). Права хранятся в таблице
 * ROLE_PERMISSIONS базы пользователей РУП и действуют для всех филиалов.
 *
 * Фиксированные роли:
 *   admin    — может всё;
 *   observer — наблюдатель РУП, только просмотр (ничего не изменяет).
 *
 * Просмотр листков и дефектов доступен всем ролям всегда.
 * Проверка прав выполняется на сервере в каждом изменяющем запросе.
 */

const { query, execute, MAIN_DB } = require('./fbDb');

/** Все права: ключ, название, группа (для админ-панели). */
const PERMISSIONS = [
  { key: 'sheets.create',      group: 'Листки осмотра', label: 'Создавать и копировать листки' },
  { key: 'sheets.edit',        group: 'Листки осмотра', label: 'Редактировать листки (дата, осматривал)' },
  { key: 'sheets.merge',       group: 'Листки осмотра', label: 'Объединять листки' },
  { key: 'sheets.delete',      group: 'Листки осмотра', label: 'Удалять листки' },
  { key: 'defects.create',     group: 'Дефекты',        label: 'Добавлять дефекты (и копировать на опоры)' },
  { key: 'defects.edit',       group: 'Дефекты',        label: 'Редактировать дефекты (примечание, обнаружил)' },
  { key: 'defects.fix',        group: 'Дефекты',        label: 'Отмечать устранение дефектов' },
  { key: 'defects.delete',     group: 'Дефекты',        label: 'Удалять дефекты' },
  { key: 'journal.conclusion', group: 'Журнал',         label: 'Заключение мастера (мероприятия, срок, объём работ)' },
  { key: 'export.excel',       group: 'Прочее',         label: 'Выгрузка в Excel' },
  { key: 'lines.edit',         group: 'Прочее',         label: 'Редактировать паспорт линии' },
];
const PERMISSION_KEYS = new Set(PERMISSIONS.map((p) => p.key));

/** Роли, права которых настраиваются. */
const EDITABLE_ROLES = ['director', 'engineer', 'master', 'viewer'];

/** Права по умолчанию (при первом запуске). Администратор может их изменить. */
const DEFAULT_PERMISSIONS = {
  director: [...PERMISSION_KEYS],
  engineer: ['sheets.create', 'sheets.edit', 'sheets.merge', 'defects.create', 'defects.edit', 'defects.fix', 'export.excel'],
  master:   ['sheets.create', 'sheets.edit', 'defects.create', 'defects.edit', 'defects.fix', 'journal.conclusion', 'export.excel'],
  viewer:   ['sheets.create', 'defects.create', 'defects.edit', 'export.excel'],
};

/** role -> Set<permission> (в памяти; обновляется при сохранении). */
let cache = new Map();

async function tableExists() {
  const rows = await query(
    "SELECT COUNT(*) AS CNT FROM RDB$RELATIONS WHERE TRIM(RDB$RELATION_NAME) = 'ROLE_PERMISSIONS'", [], MAIN_DB,
  );
  return Number(rows[0]?.cnt ?? 0) > 0;
}

/** Создаёт таблицу прав (если её нет), заполняет значениями по умолчанию и загружает в память. */
async function initPermissions() {
  if (!(await tableExists())) {
    console.log('[permissions] Создаю таблицу ROLE_PERMISSIONS с правами по умолчанию');
    await execute(
      `CREATE TABLE ROLE_PERMISSIONS (
         ROLE       VARCHAR(50) NOT NULL,
         PERMISSION VARCHAR(50) NOT NULL,
         CONSTRAINT PK_ROLE_PERMISSIONS PRIMARY KEY (ROLE, PERMISSION)
       )`, [], MAIN_DB,
    );
    for (const [role, keys] of Object.entries(DEFAULT_PERMISSIONS)) {
      for (const key of keys) {
        await execute('INSERT INTO ROLE_PERMISSIONS (ROLE, PERMISSION) VALUES (?, ?)', [role, key], MAIN_DB);
      }
    }
  }
  await reload();
}

async function reload() {
  const rows = await query('SELECT ROLE, PERMISSION FROM ROLE_PERMISSIONS', [], MAIN_DB);
  const map = new Map(EDITABLE_ROLES.map((r) => [r, new Set()]));
  for (const r of rows) {
    const role = String(r.role).trim();
    const key  = String(r.permission).trim();
    if (map.has(role) && PERMISSION_KEYS.has(key)) map.get(role).add(key);
  }
  cache = map;
}

/** Права роли (массив ключей). */
function permissionsOf(role) {
  if (role === 'admin') return [...PERMISSION_KEYS];
  if (role === 'observer') return [];
  return [...(cache.get(role) ?? [])];
}

function hasPermission(role, key) {
  if (role === 'admin') return true;
  if (role === 'observer') return false;
  return cache.get(role)?.has(key) === true;
}

/** Middleware: требует все перечисленные права. */
function requirePermission(...keys) {
  return (req, res, next) => {
    const missing = keys.find((k) => !hasPermission(req.role, k));
    if (missing) return res.status(403).json({ error: 'Недостаточно прав для этого действия', permission: missing });
    next();
  };
}

/** Сохраняет права роли и обновляет кэш. */
async function savePermissions(role, keys) {
  const clean = [...new Set(keys)].filter((k) => PERMISSION_KEYS.has(k));
  await execute('DELETE FROM ROLE_PERMISSIONS WHERE ROLE = ?', [role], MAIN_DB);
  for (const key of clean) {
    await execute('INSERT INTO ROLE_PERMISSIONS (ROLE, PERMISSION) VALUES (?, ?)', [role, key], MAIN_DB);
  }
  await reload();
  return permissionsOf(role);
}

module.exports = {
  PERMISSIONS, PERMISSION_KEYS, EDITABLE_ROLES,
  initPermissions, permissionsOf, hasPermission, requirePermission, savePermissions,
};
