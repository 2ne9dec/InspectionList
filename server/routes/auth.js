'use strict';

/**
 * routes/auth.js -- авторизация и управление пользователями (Firebird).
 *
 * Пользователи филиала хранятся в базе своего филиала, главный администратор
 * и наблюдатели РУП — в основной базе. Логин уникален во всех базах.
 *
 * POST   /login                       { username, password, filialId: N | 'rup' }
 * GET    /users                       (администраторы: главный — все, филиала — своего филиала)
 * GET    /users/me
 * POST   /users                       (администраторы; руководитель — инженер/мастер/пользователь своего филиала)
 * PATCH  /users/:id?filialId=N        (администраторы; себе — только ФИО)
 * DELETE /users/:id?filialId=N        (администраторы)
 * POST   /users/:id/resetPassword?filialId=N  (администраторы; руководитель — инженер/мастер/пользователь своего филиала)
 * POST   /changePassword              (свой пароль)
 *
 * ?filialId=N — филиал (база) пользователя; пусто — основная база.
 * Администратор филиала всегда работает только с базой своего филиала.
 */

const { Router } = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
let rateLimit, ipKeyGenerator;
try { ({ rateLimit, ipKeyGenerator } = require('express-rate-limit')); } catch { rateLimit = null; }

const { query, execute, queryOne, MAIN_DB, MULTI_DB, FILIAL_DB_IDS, HAS_SEPARATE_MAIN, dbKeyForFilial, isKnownFilial, physicalDbKey } = require('../lib/fbDb');
const { signToken } = require('../lib/auth');

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);
const VALID_ROLES   = new Set(['admin', 'director_sbpl', 'engineer_sbpl', 'director', 'engineer', 'master', 'electrician', 'observer']);
// Кто может управлять пользователями. Без филиала — главный администратор (все филиалы),
// с филиалом — администратор филиала (только пользователи своего филиала).
const MANAGER_ROLES = new Set(['director_sbpl', 'director', 'admin']);
// Роли, которые могут быть без филиала: главный администратор и наблюдатель РУП.
const GLOBAL_ROLES  = new Set(['admin', 'observer']);
// Руководители создают пользователей и задают временный пароль только сотрудникам своей службы,
// не изменяют и не удаляют пользователей:
//   Руководитель СБПЛСиОИ — инженеры СБПЛСиОИ; Руководитель СЛ — инженеры, мастера, электромонтёры СЛ.
const DIRECTOR_ASSIGNABLE = {
  director_sbpl: new Set(['engineer_sbpl']),
  director:      new Set(['engineer', 'master', 'electrician']),
};
const isDirectorRole = (role) => Object.prototype.hasOwnProperty.call(DIRECTOR_ASSIGNABLE, role);
const directorMay = (directorRole, targetRole) => DIRECTOR_ASSIGNABLE[directorRole].has(targetRole);

const router = Router();

// ── Rate limiter ──────────────────────────────────────────────────────────────
const loginLimiter = rateLimit ? rateLimit({
  windowMs:    15 * 60 * 1000,
  max:         5,
  // req.ip — адрес сокета (trust proxy не включён), заголовку X-Forwarded-For не доверяем
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? '')}::${String(req.body?.username ?? '').toLowerCase()}`,
  message:     { error: 'Слишком много попыток. Попробуйте через 15 минут.' },
  standardHeaders: true,
  legacyHeaders:   false,
  validate:    { xForwardedForHeader: false },
}) : (req, res, next) => next();

// ── Базы пользователей ────────────────────────────────────────────────────────

/**
 * Где искать пользователей: { dbKey, filter, fparams }.
 * Пользователи филиала — в базе своего филиала (FILIAL_ID = N),
 * пользователи РУП (главный администратор, наблюдатели) — в базе РУП с пустым FILIAL_ID.
 * База РУП может совпадать с базой Гомельских ЭС, поэтому фильтр по FILIAL_ID обязателен.
 */
function sourceFor(filialId) {
  if (!MULTI_DB) return { dbKey: MAIN_DB, filter: '', fparams: [] };
  // Отдельная база пользователей: все учётные записи в ней, филиал — поле FILIAL_ID
  if (HAS_SEPARATE_MAIN) {
    return filialId == null
      ? { dbKey: MAIN_DB, filter: ' AND FILIAL_ID IS NULL', fparams: [] }
      : { dbKey: MAIN_DB, filter: ' AND FILIAL_ID = ?', fparams: [Number(filialId)] };
  }
  if (filialId == null) return { dbKey: MAIN_DB, filter: ' AND FILIAL_ID IS NULL', fparams: [] };
  return { dbKey: dbKeyForFilial(filialId), filter: ' AND FILIAL_ID = ?', fparams: [Number(filialId)] };
}

function userSources() {
  if (!MULTI_DB) return [sourceFor(null)];
  if (HAS_SEPARATE_MAIN) return [{ dbKey: MAIN_DB, filter: '', fparams: [] }];
  return [sourceFor(null), ...FILIAL_DB_IDS.map((id) => sourceFor(id))];
}

/** База, в которой хранится пользователь с указанным филиалом. */
function userDbKey(filialId) {
  return sourceFor(filialId).dbKey;
}

/** Добавляет allowedLineIds и allowedVoltageIds из junction-таблиц. */
async function enrichUser(row, dbKey) {
  const lines = await query(
    'SELECT LINE_ID FROM USER_ALLOWED_LINES WHERE USER_ID = ?', [row.id], dbKey,
  );
  const voltages = await query(
    'SELECT VOLTAGE_ID FROM USER_ALLOWED_VOLTAGES WHERE USER_ID = ?', [row.id], dbKey,
  );
  return {
    id:                row.id,
    username:          row.username,
    password:          row.password,
    displayName:       row.display_name,
    role:              row.role,
    filialId:          row.filial_id,
    allowedLineIds:    lines.length    > 0 ? lines.map(r => r.line_id)       : null,
    allowedVoltageIds: voltages.length > 0 ? voltages.map(r => r.voltage_id) : null,
    mustChangePassword: Number(row.must_change_password ?? 0) === 1,
  };
}

/** Пользователь по ID в базе филиала filialId (null — основная база). */
async function findUser(id, filialId) {
  const { dbKey, filter, fparams } = sourceFor(filialId);
  const row = await queryOne('SELECT * FROM USERS WHERE ID = ?' + filter, [String(id), ...fparams], dbKey);
  return row ? enrichUser(row, dbKey) : null;
}

/**
 * Поиск по логину. scope — что выбрано на странице входа:
 *   число   — филиал: ищем в базе этого филиала;
 *   'rup'   — РУП (главный администратор, наблюдатели): основная база;
 *   undefined — филиал не выбран: вход администратора; ищем во всех базах.
 * Главный администратор входит при любом выборе филиала.
 */
async function findUserByUsername(username, scope) {
  let sources = userSources();
  if (MULTI_DB && scope === 'rup') sources = [sourceFor(null)];
  else if (MULTI_DB && Number.isInteger(scope)) sources = isKnownFilial(scope) ? [sourceFor(scope)] : [];
  for (const { dbKey, filter, fparams } of sources) {
    const row = await queryOne('SELECT * FROM USERS WHERE USERNAME = ?' + filter, [username, ...fparams], dbKey);
    if (row) return enrichUser(row, dbKey);
  }
  // Главный администратор не привязан к филиалу: находим его, даже если филиал выбран
  if (MULTI_DB && scope !== undefined) {
    const { dbKey, filter, fparams } = sourceFor(null);
    const row = await queryOne(
      "SELECT * FROM USERS WHERE USERNAME = ? AND ROLE = 'admin'" + filter, [username, ...fparams], dbKey,
    );
    if (row) return enrichUser(row, dbKey);
  }
  return null;
}

/** Логин занят в какой-либо базе (кроме пользователя exceptId в базе exceptDbKey). */
async function usernameTaken(username, exceptId, exceptDbKey) {
  // Логин уникален в пределах физической базы (ограничение UQ_USERS_USERNAME), проверяем без фильтра филиала
  // База РУП может совпадать с базой Гомеля — сравниваем физические базы, а не ключи
  const exceptPhysical = exceptDbKey !== undefined ? physicalDbKey(exceptDbKey) : undefined;
  for (const dbKey of new Set(userSources().map((s) => physicalDbKey(s.dbKey)))) {
    const row = await queryOne('SELECT ID FROM USERS WHERE UPPER(USERNAME) = UPPER(?)', [username], dbKey);
    if (row && !(dbKey === exceptPhysical && String(row.id) === String(exceptId))) return true;
  }
  return false;
}

/**
 * Требования к паролю (свой новый пароль и временный пароль от администратора):
 * не менее 8 символов, буквы и цифры, не совпадает с прежним.
 * Возвращает текст ошибки или null.
 */
function validateNewPassword(newPass, oldPass) {
  if (typeof newPass !== 'string' || newPass.length < 8)
    return 'Пароль должен быть не менее 8 символов';
  if (!/[A-Za-zА-Яа-яЁё]/.test(newPass) || !/\d/.test(newPass))
    return 'Пароль должен содержать буквы и цифры';
  if (oldPass && newPass === oldPass)
    return 'Новый пароль должен отличаться от текущего';
  return null;
}

function safeUser(user) {
  const { password: _, ...rest } = user;
  return rest;
}

async function verifyPass(plain, storedHash) {
  const isSha256 = /^[a-f0-9]{64}$/.test(storedHash);
  if (isSha256) {
    const sha = crypto.createHash('sha256').update(plain).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(sha), Buffer.from(storedHash));
  }
  return bcrypt.compare(plain, storedHash);
}

async function saveUserLines(userId, lineIds, dbKey) {
  await execute('DELETE FROM USER_ALLOWED_LINES WHERE USER_ID = ?', [userId], dbKey);
  for (const lid of (lineIds ?? [])) {
    await execute('INSERT INTO USER_ALLOWED_LINES (USER_ID, LINE_ID) VALUES (?, ?)', [userId, Number(lid)], dbKey);
  }
}

async function saveUserVoltages(userId, voltageIds, dbKey) {
  await execute('DELETE FROM USER_ALLOWED_VOLTAGES WHERE USER_ID = ?', [userId], dbKey);
  for (const vid of (voltageIds ?? [])) {
    await execute('INSERT INTO USER_ALLOWED_VOLTAGES (USER_ID, VOLTAGE_ID) VALUES (?, ?)', [userId, Number(vid)], dbKey);
  }
}

// ── Права ─────────────────────────────────────────────────────────────────────

/** Middleware: только администраторы управляют пользователями. */
function requireManager(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: 'Не авторизован' });
  if (!MANAGER_ROLES.has(req.role)) return res.status(403).json({ error: 'Недостаточно прав' });
  next();
}

/** Middleware: изменять и удалять пользователей могут только администраторы. */
function requireAdmin(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: 'Не авторизован' });
  if (req.role !== 'admin') return res.status(403).json({ error: 'Недостаточно прав' });
  next();
}

/** Главный администратор: управляет пользователями всех филиалов. */
function isGlobalManager(req) {
  return MANAGER_ROLES.has(req.role) && req.filialId == null;
}

/**
 * Проверка сочетания роли и филиала. Возвращает текст ошибки или null.
 *  - наблюдатель РУП (observer) — всегда без филиала, назначает только главный администратор;
 *  - без филиала могут быть только главный администратор и наблюдатель;
 *  - остальные роли обязательно привязаны к филиалу.
 */
function validateRoleFilial(req, role, filialId) {
  if (role === 'observer' && !isGlobalManager(req))
    return 'Роль «Наблюдатель РУП» может назначить только главный администратор';
  if (role === 'observer' && filialId != null)
    return 'Наблюдатель РУП не привязывается к филиалу';
  if (role === 'admin' && filialId != null)
    return 'Администратор назначается только без филиала (главный администратор)';
  if (filialId == null && !GLOBAL_ROLES.has(role))
    return 'Для этой роли укажите филиал';
  if (filialId == null && !isGlobalManager(req))
    return 'Недостаточно прав';
  if (filialId != null && !isKnownFilial(filialId))
    return 'Для этого филиала не настроена база';
  return null;
}

/**
 * Филиал (база) целевого пользователя из ?filialId=.
 * Администратор филиала всегда работает только со своим филиалом —
 * пользователей РУП и других филиалов он не видит и не меняет.
 */
function targetFilial(req) {
  if (req.filialId != null) return req.filialId;
  const raw = req.query.filialId;
  return raw === undefined || raw === '' || raw === 'null' ? null : Number(raw);
}

function serverError(res, err) {
  console.error('[auth]', err.message);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
}

// ── GET /users ────────────────────────────────────────────────────────────────
router.get('/users', requireManager, async (req, res) => {
  try {
    const result = [];
    // Главный администратор — все базы, администратор филиала — только свой филиал
    const sources = req.filialId == null ? userSources() : [sourceFor(req.filialId)];
    for (const { dbKey, filter, fparams } of sources) {
      const rows = await query('SELECT * FROM USERS WHERE 1=1' + filter + ' ORDER BY ID', fparams, dbKey);
      for (const row of rows) result.push(safeUser(await enrichUser(row, dbKey)));
    }
    res.json(result);
  } catch (err) {
    serverError(res, err);
  }
});

// ── GET /users/me ─────────────────────────────────────────────────────────────
router.get('/users/me', async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Не авторизован' });
    const user = await findUser(req.userId, req.filialId);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(safeUser(user));
  } catch (err) {
    serverError(res, err);
  }
});

// ── POST /login ───────────────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Укажите логин и пароль' });
    // Филиал, выбранный на странице входа ('rup' — РУП)
    const rawScope = req.body.filialId;
    const scope = rawScope === 'rup' ? 'rup'
      : (rawScope != null && rawScope !== '' && Number.isInteger(Number(rawScope)) ? Number(rawScope) : undefined);

    const user = await findUserByUsername(username, scope);
    if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' });

    const ok = await verifyPass(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Неверный логин или пароль' });

    // Филиал на странице входа обязателен для всех, кроме администратора системы
    const isSystemAdmin = user.role === 'admin' && user.filialId == null;
    if (MULTI_DB && scope === undefined && !isSystemAdmin)
      return res.status(400).json({ error: 'Выберите филиал' });

    // Lazy migration: SHA-256 -> bcrypt
    if (/^[a-f0-9]{64}$/.test(user.password)) {
      const newHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
      await execute('UPDATE USERS SET PASSWORD = ? WHERE ID = ?', [newHash, user.id], userDbKey(user.filialId));
    }

    const token = signToken(user);
    res.json({ ...safeUser(user), token });
  } catch (err) {
    serverError(res, err);
  }
});

// ── POST /users ───────────────────────────────────────────────────────────────
router.post('/users', requireManager, async (req, res) => {
  try {
    const { username, password, displayName, role, allowedLineIds, allowedVoltageIds } = req.body ?? {};
    const effRole  = role ?? 'electrician';
    // Администратор филиала создаёт пользователей только в своём филиале;
    // наблюдатель РУП не привязан к филиалу
    const filialId = effRole === 'observer' ? null
      : (req.filialId != null ? req.filialId
        : (req.body?.filialId != null && req.body.filialId !== '' ? Number(req.body.filialId) : null));
    if (!username || !password)
      return res.status(400).json({ error: 'Укажите логин и временный пароль' });
    const passErr = validateNewPassword(password);
    if (passErr) return res.status(400).json({ error: passErr });
    if (!VALID_ROLES.has(effRole))
      return res.status(400).json({ error: `Недопустимая роль: ${effRole}` });
    if (isDirectorRole(req.role) && !directorMay(req.role, effRole))
      return res.status(403).json({ error: 'Руководитель может создавать только сотрудников своей службы' });
    const roleErr = validateRoleFilial(req, effRole, filialId);
    if (roleErr) return res.status(400).json({ error: roleErr });

    const login = String(username).trim().toLowerCase();
    if (await usernameTaken(login))
      return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });

    const dbKey = userDbKey(filialId);
    // Числовой ID в пределах базы
    const ids = await query('SELECT ID FROM USERS', [], dbKey);
    const maxId = ids.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
    const newId = String(maxId + 1);

    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    // Пароль от администратора временный: при первом входе пользователь задаёт свой
    await execute(
      'INSERT INTO USERS (ID, USERNAME, PASSWORD, DISPLAY_NAME, ROLE, FILIAL_ID, MUST_CHANGE_PASSWORD) VALUES (?,?,?,?,?,?,1)',
      [newId, login, hash, String(displayName ?? login).trim(), effRole, filialId],
      dbKey,
    );

    if (Array.isArray(allowedLineIds))    await saveUserLines(newId, allowedLineIds, dbKey);
    if (Array.isArray(allowedVoltageIds)) await saveUserVoltages(newId, allowedVoltageIds, dbKey);

    const user = await findUser(newId, filialId);
    res.status(201).json(safeUser(user));
  } catch (err) {
    serverError(res, err);
  }
});

// ── PATCH /users/:id ──────────────────────────────────────────────────────────
router.patch('/users/:id', async (req, res) => {
  try {
    const id     = req.params.id;
    const isSelf = String(req.userId) === String(id) && targetFilial(req) == req.filialId;
    const userFilial = isSelf ? req.filialId : targetFilial(req);
    const user   = await findUser(id, userFilial);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    // Изменять пользователей могут только администраторы; руководитель — только своё ФИО
    const canManage = req.role === 'admin';
    if (!isSelf && !canManage)
      return res.status(403).json({ error: 'Доступ запрещён' });

    const body   = req.body ?? {};
    const dbKey  = userDbKey(user.filialId);
    const sets   = [];
    const params = [];

    if (canManage) {
      if (isSelf && body.role !== undefined && body.role !== user.role)
        return res.status(400).json({ error: 'Нельзя изменить собственную роль' });
      const newRole = body.role !== undefined ? body.role : user.role;
      const newFilial = body.filialId !== undefined
        ? (body.filialId != null && body.filialId !== '' ? Number(body.filialId) : null)
        : user.filialId;
      if (newFilial !== user.filialId) {
        // Пользователь хранится в базе своего филиала — перенос между базами не выполняется
        if (MULTI_DB) return res.status(400).json({ error: 'Филиал пользователя изменить нельзя — создайте нового пользователя в нужном филиале' });
        if (!isGlobalManager(req)) return res.status(403).json({ error: 'Нельзя перевести пользователя в другой филиал' });
        sets.push('FILIAL_ID = ?'); params.push(newFilial);
      }
      // Роль проверяется только при смене (старые роли, например администратор филиала, сохраняются)
      if (body.role !== undefined && newRole !== user.role) {
        if (!VALID_ROLES.has(newRole)) return res.status(400).json({ error: `Недопустимая роль: ${newRole}` });
        const roleErr = validateRoleFilial(req, newRole, newFilial);
        if (roleErr) return res.status(400).json({ error: roleErr });
        sets.push('ROLE = ?'); params.push(newRole);
      }
      if (body.username !== undefined) {
        const login = String(body.username).trim().toLowerCase();
        if (!login) return res.status(400).json({ error: 'Укажите логин' });
        if (await usernameTaken(login, id, dbKey)) return res.status(409).json({ error: 'Логин уже занят' });
        sets.push('USERNAME = ?'); params.push(login);
      }
      if (body.allowedLineIds    !== undefined) await saveUserLines(id, Array.isArray(body.allowedLineIds)    ? body.allowedLineIds    : null, dbKey);
      if (body.allowedVoltageIds !== undefined) await saveUserVoltages(id, Array.isArray(body.allowedVoltageIds) ? body.allowedVoltageIds : null, dbKey);
    }
    if (body.displayName !== undefined) { sets.push('DISPLAY_NAME = ?'); params.push(String(body.displayName).trim()); }

    if (sets.length > 0) {
      params.push(id);
      await execute(`UPDATE USERS SET ${sets.join(', ')} WHERE ID = ?`, params, dbKey);
    }

    const updated = await findUser(id, user.filialId);
    res.json(safeUser(updated));
  } catch (err) {
    serverError(res, err);
  }
});

// ── DELETE /users/:id ─────────────────────────────────────────────────────────
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const filialId = targetFilial(req);
    if (String(id) === String(req.userId) && filialId == req.filialId)
      return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    const user = await findUser(id, filialId);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    const dbKey = userDbKey(user.filialId);
    await execute('DELETE FROM USER_ALLOWED_LINES WHERE USER_ID = ?', [id], dbKey);
    await execute('DELETE FROM USER_ALLOWED_VOLTAGES WHERE USER_ID = ?', [id], dbKey);
    await execute('DELETE FROM USERS WHERE ID = ?', [id], dbKey);
    res.json({ ok: true });
  } catch (err) {
    serverError(res, err);
  }
});

// ── POST /users/:id/resetPassword ─────────────────────────────────────────────
// Администратор задаёт временный пароль (пользователь забыл свой).
// Администратор филиала — только пользователям своего филиала; пользователей РУП
// (главный администратор, наблюдатели) — только главный администратор.
router.post('/users/:id/resetPassword', requireManager, async (req, res) => {
  try {
    const id          = req.params.id;
    const { newPass } = req.body ?? {};
    const passErr = validateNewPassword(newPass);
    if (passErr) return res.status(400).json({ error: passErr });
    const user = await findUser(id, targetFilial(req));
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    if (isDirectorRole(req.role) && !directorMay(req.role, user.role))
      return res.status(403).json({ error: 'Руководитель задаёт временный пароль только сотрудникам своей службы' });
    const hash = bcrypt.hashSync(newPass, BCRYPT_ROUNDS);
    // Пароль, заданный администратором, временный: при входе пользователь обязан его сменить
    await execute('UPDATE USERS SET PASSWORD = ?, MUST_CHANGE_PASSWORD = 1 WHERE ID = ?', [hash, id], userDbKey(user.filialId));
    res.json({ ok: true });
  } catch (err) {
    serverError(res, err);
  }
});

// ── POST /changePassword ──────────────────────────────────────────────────────
router.post('/changePassword', async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Не авторизован' });
    const { oldPass, newPass } = req.body ?? {};
    if (!oldPass || !newPass)
      return res.status(400).json({ error: 'Укажите текущий и новый пароль' });
    const passErr = validateNewPassword(newPass, oldPass);
    if (passErr) return res.status(400).json({ error: passErr });
    const user = await findUser(req.userId, req.filialId);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    const ok = await verifyPass(oldPass, user.password);
    if (!ok) return res.status(403).json({ error: 'Неверный текущий пароль' });
    const hash = bcrypt.hashSync(newPass, BCRYPT_ROUNDS);
    await execute(
      'UPDATE USERS SET PASSWORD = ?, MUST_CHANGE_PASSWORD = 0 WHERE ID = ?',
      [hash, String(req.userId)],
      userDbKey(req.filialId),
    );
    // Новый токен — уже без признака обязательной смены пароля
    const updated = await findUser(req.userId, req.filialId);
    res.json({ ...safeUser(updated), token: signToken(updated) });
  } catch (err) {
    serverError(res, err);
  }
});

module.exports = router;
