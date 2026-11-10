'use strict';

/**
 * permissions.js — права ролей.
 *
 * Администратор системы в админ-панели задаёт, что может каждая роль
 * (руководитель, инженер, мастер, пользователь). Права хранятся в таблице
 * ROLE_PERMISSIONS базы пользователей РУП и действуют для всех филиалов.
 *
 * Администратор может всё, кроме удаления листков с филиалом: удалять листки
 * может только администратор системы (без филиала), это право не настраивается.
 * Наблюдателю РУП можно дать только права, не изменяющие данные (выгрузка в Excel):
 * любые изменения для него сервер запрещает (blockReadOnlyWrites).
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
  { key: 'defects.create',     group: 'Дефекты',        label: 'Добавлять дефекты (и копировать на опоры)' },
  { key: 'defects.edit',       group: 'Дефекты',        label: 'Редактировать дефекты (примечание, обнаружил)' },
  { key: 'defects.fix',        group: 'Дефекты',        label: 'Отмечать устранение дефектов' },
  { key: 'defects.delete',     group: 'Дефекты',        label: 'Удалять дефекты' },
  { key: 'journal.conclusion', group: 'Журнал',         label: 'Заключение мастера (мероприятия, срок, объём работ)' },
  { key: 'export.excel',       group: 'Прочее',         label: 'Выгрузка в Excel' },
];
const PERMISSION_KEYS = new Set(PERMISSIONS.map((p) => p.key));

/** Удаление листков — только администратор системы, не настраивается. */
const SYSTEM_ADMIN_ONLY = ['sheets.delete'];

/** Права, которые можно дать наблюдателю РУП (не изменяют данные). */
const OBSERVER_ALLOWED = new Set(['export.excel']);

/** Роли, права которых настраиваются. */
const EDITABLE_ROLES = ['director_sbpl', 'engineer_sbpl', 'director', 'engineer', 'master', 'electrician', 'observer'];

/** Права по умолчанию (при первом запуске). Администратор может их изменить. */
const DEFAULT_PERMISSIONS = {
  director_sbpl: ['sheets.create', 'sheets.edit', 'sheets.merge', 'defects.create', 'defects.edit', 'defects.fix', 'journal.conclusion', 'export.excel'],
  director: ['sheets.create', 'sheets.edit', 'sheets.merge', 'defects.create', 'defects.edit', 'defects.fix', 'journal.conclusion', 'export.excel'],
  engineer:      ['sheets.create', 'sheets.edit', 'sheets.merge', 'defects.create', 'defects.edit', 'defects.fix', 'export.excel'],
  engineer_sbpl: ['sheets.create', 'sheets.edit', 'sheets.merge', 'defects.create', 'defects.edit', 'defects.fix', 'export.excel'],
  master:        ['sheets.create', 'sheets.edit', 'defects.create', 'defects.edit', 'defects.fix', 'journal.conclusion', 'export.excel'],
  electrician:   ['sheets.create', 'defects.create', 'defects.edit', 'export.excel'],
  observer: ['export.excel'],
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
  // Однократно: роль «Пользователь» (viewer) заменена на «Электромонтёр СЛ» (electrician),
  // добавлена роль «Инженер СБПЛСиОИ» (engineer_sbpl)
  const v3 = await query("SELECT COUNT(*) AS CNT FROM ROLE_PERMISSIONS WHERE ROLE = '_perm_v3'", [], MAIN_DB);
  if (Number(v3[0]?.cnt ?? 0) === 0) {
    const el = await query("SELECT COUNT(*) AS CNT FROM ROLE_PERMISSIONS WHERE ROLE = 'electrician'", [], MAIN_DB);
    if (Number(el[0]?.cnt ?? 0) === 0) {
      const vw = await query("SELECT PERMISSION FROM ROLE_PERMISSIONS WHERE ROLE = 'viewer'", [], MAIN_DB);
      const keys = vw.length > 0 ? vw.map((r) => r.permission) : DEFAULT_PERMISSIONS.electrician;
      for (const key of keys)
        await execute("INSERT INTO ROLE_PERMISSIONS (ROLE, PERMISSION) VALUES ('electrician', ?)", [key], MAIN_DB);
    }
    await execute("DELETE FROM ROLE_PERMISSIONS WHERE ROLE = 'viewer'", [], MAIN_DB);
    const sb = await query("SELECT COUNT(*) AS CNT FROM ROLE_PERMISSIONS WHERE ROLE = 'engineer_sbpl'", [], MAIN_DB);
    if (Number(sb[0]?.cnt ?? 0) === 0) {
      for (const key of DEFAULT_PERMISSIONS.engineer_sbpl)
        await execute("INSERT INTO ROLE_PERMISSIONS (ROLE, PERMISSION) VALUES ('engineer_sbpl', ?)", [key], MAIN_DB);
    }
    await execute("INSERT INTO ROLE_PERMISSIONS (ROLE, PERMISSION) VALUES ('_perm_v3', '-')", [], MAIN_DB);
  }
  // Однократно: добавлена роль «Руководитель СБПЛСиОИ» (director_sbpl)
  const v4 = await query("SELECT COUNT(*) AS CNT FROM ROLE_PERMISSIONS WHERE ROLE = '_perm_v4'", [], MAIN_DB);
  if (Number(v4[0]?.cnt ?? 0) === 0) {
    const ds = await query("SELECT COUNT(*) AS CNT FROM ROLE_PERMISSIONS WHERE ROLE = 'director_sbpl'", [], MAIN_DB);
    if (Number(ds[0]?.cnt ?? 0) === 0) {
      for (const key of DEFAULT_PERMISSIONS.director_sbpl)
        await execute("INSERT INTO ROLE_PERMISSIONS (ROLE, PERMISSION) VALUES ('director_sbpl', ?)", [key], MAIN_DB);
    }
    await execute("INSERT INTO ROLE_PERMISSIONS (ROLE, PERMISSION) VALUES ('_perm_v4', '-')", [], MAIN_DB);
  }
  // Наблюдатель РУП стал настраиваемым: при первом запуске новой версии даём ему выгрузку в Excel
  const obs = await query("SELECT COUNT(*) AS CNT FROM ROLE_PERMISSIONS WHERE ROLE = 'observer'", [], MAIN_DB);
  const marker = await query("SELECT COUNT(*) AS CNT FROM ROLE_PERMISSIONS WHERE ROLE = '_observer_init'", [], MAIN_DB);
  if (Number(obs[0]?.cnt ?? 0) === 0 && Number(marker[0]?.cnt ?? 0) === 0) {
    await execute("INSERT INTO ROLE_PERMISSIONS (ROLE, PERMISSION) VALUES ('observer', 'export.excel')", [], MAIN_DB);
    await execute("INSERT INTO ROLE_PERMISSIONS (ROLE, PERMISSION) VALUES ('_observer_init', '-')", [], MAIN_DB);
  }
  // Однократно: удаление листков и паспорт линии больше не настраиваются,
  // руководитель по умолчанию ничего не удаляет
  const v2 = await query("SELECT COUNT(*) AS CNT FROM ROLE_PERMISSIONS WHERE ROLE = '_perm_v2'", [], MAIN_DB);
  if (Number(v2[0]?.cnt ?? 0) === 0) {
    await execute("DELETE FROM ROLE_PERMISSIONS WHERE PERMISSION IN ('sheets.delete', 'lines.edit')", [], MAIN_DB);
    await execute("DELETE FROM ROLE_PERMISSIONS WHERE ROLE = 'director' AND PERMISSION = 'defects.delete'", [], MAIN_DB);
    await execute("INSERT INTO ROLE_PERMISSIONS (ROLE, PERMISSION) VALUES ('_perm_v2', '-')", [], MAIN_DB);
  }
  const rows = await query('SELECT ROLE, PERMISSION FROM ROLE_PERMISSIONS', [], MAIN_DB);
  const map = new Map(EDITABLE_ROLES.map((r) => [r, new Set()]));
  for (const r of rows) {
    const role = String(r.role).trim();
    const key  = String(r.permission).trim();
    if (map.has(role) && PERMISSION_KEYS.has(key)) map.get(role).add(key);
  }
  cache = map;
}

/**
 * Права роли (массив ключей). filialId нужен для администратора:
 * удаление листков есть только у администратора системы (без филиала).
 */
function permissionsOf(role, filialId) {
  if (role === 'admin') {
    return [...PERMISSION_KEYS, ...(filialId == null ? SYSTEM_ADMIN_ONLY : [])];
  }
  const set = cache.get(role) ?? new Set();
  if (role === 'observer') return [...set].filter((k) => OBSERVER_ALLOWED.has(k));
  return [...set];
}

function hasPermission(role, key, filialId) {
  return permissionsOf(role, filialId).includes(key);
}

/** Middleware: требует все перечисленные права. */
function requirePermission(...keys) {
  return (req, res, next) => {
    const missing = keys.find((k) => !hasPermission(req.role, k, req.filialId));
    if (missing) return res.status(403).json({ error: 'Недостаточно прав для этого действия', permission: missing });
    next();
  };
}

/** Сохраняет права роли и обновляет кэш. */
async function savePermissions(role, keys) {
  const clean = [...new Set(keys)]
    .filter((k) => PERMISSION_KEYS.has(k))
    .filter((k) => role !== 'observer' || OBSERVER_ALLOWED.has(k));
  await execute('DELETE FROM ROLE_PERMISSIONS WHERE ROLE = ?', [role], MAIN_DB);
  for (const key of clean) {
    await execute('INSERT INTO ROLE_PERMISSIONS (ROLE, PERMISSION) VALUES (?, ?)', [role, key], MAIN_DB);
  }
  await reload();
  return permissionsOf(role);
}

module.exports = {
  PERMISSIONS, PERMISSION_KEYS, EDITABLE_ROLES, OBSERVER_ALLOWED,
  initPermissions, permissionsOf, hasPermission, requirePermission, savePermissions,
};
