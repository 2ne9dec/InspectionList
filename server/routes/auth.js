'use strict';

/**
 * routes/auth.js -- авторизация и управление пользователями (Firebird).
 *
 * POST   /login
 * GET    /users          (только director/engineer)
 * GET    /users/me
 * POST   /users          (только director/engineer)
 * PATCH  /users/:id
 * DELETE /users/:id      (только director/engineer)
 * POST   /users/:id/resetPassword  (только director/engineer)
 * POST   /changePassword
 */

'use strict';

const { Router } = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
let rateLimit;
try { rateLimit = require('express-rate-limit'); } catch { rateLimit = null; }

const { query, execute, queryOne } = require('../lib/fbDb');
const { signToken } = require('../lib/auth');

const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);
const VALID_ROLES   = new Set(['director', 'engineer', 'master', 'viewer']);

const router = Router();

// ── Rate limiter ──────────────────────────────────────────────────────────────
const loginLimiter = rateLimit ? rateLimit({
  windowMs:    15 * 60 * 1000,
  max:         5,
  keyGenerator: (req) => `${req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'local'}::${(req.body?.username ?? '').toLowerCase()}`,
  message:     { error: 'Слишком много попыток. Попробуйте через 15 минут.' },
  standardHeaders: true,
  legacyHeaders:   false,
  validate:    { xForwardedForHeader: false },
}) : (req, res, next) => next();

// ── Хелперы работы с пользователями ──────────────────────────────────────────

async function findUserById(id) {
  const row = await queryOne('SELECT * FROM USERS WHERE ID = ?', [String(id)]);
  if (!row) return null;
  return await enrichUser(row);
}

async function findUserByUsername(username) {
  const row = await queryOne('SELECT * FROM USERS WHERE USERNAME = ?', [username]);
  if (!row) return null;
  return await enrichUser(row);
}

/** Добавляет allowedLineIds и allowedVoltageIds из junction-таблиц. */
async function enrichUser(row) {
  const lines = await query(
    'SELECT LINE_ID FROM USER_ALLOWED_LINES WHERE USER_ID = ?', [row.id],
  );
  const voltages = await query(
    'SELECT VOLTAGE_ID FROM USER_ALLOWED_VOLTAGES WHERE USER_ID = ?', [row.id],
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
  };
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

async function saveUserLines(userId, lineIds) {
  await execute('DELETE FROM USER_ALLOWED_LINES WHERE USER_ID = ?', [userId]);
  for (const lid of (lineIds ?? [])) {
    await execute(
      'INSERT INTO USER_ALLOWED_LINES (USER_ID, LINE_ID) VALUES (?, ?)',
      [userId, Number(lid)],
    );
  }
}

async function saveUserVoltages(userId, voltageIds) {
  await execute('DELETE FROM USER_ALLOWED_VOLTAGES WHERE USER_ID = ?', [userId]);
  for (const vid of (voltageIds ?? [])) {
    await execute(
      'INSERT INTO USER_ALLOWED_VOLTAGES (USER_ID, VOLTAGE_ID) VALUES (?, ?)',
      [userId, Number(vid)],
    );
  }
}

// ── GET /users ────────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM USERS ORDER BY ID');
    const users = await Promise.all(rows.map(enrichUser));
    res.json(users.map(safeUser));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /users/me ─────────────────────────────────────────────────────────────
router.get('/users/me', async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Не авторизован' });
    const user = await findUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(safeUser(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /login ───────────────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Укажите логин и пароль' });

    const user = await findUserByUsername(username);
    if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' });

    const ok = await verifyPass(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Неверный логин или пароль' });

    // Lazy migration: SHA-256 -> bcrypt
    if (/^[a-f0-9]{64}$/.test(user.password)) {
      const newHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
      await execute('UPDATE USERS SET PASSWORD = ? WHERE ID = ?', [newHash, user.id]);
    }

    const token = signToken(user);
    res.json({ ...safeUser(user), token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /users ───────────────────────────────────────────────────────────────
router.post('/users', async (req, res) => {
  try {
    const { username, password, displayName, role, filialId, allowedLineIds, allowedVoltageIds } = req.body ?? {};
    if (!username || !password)
      return res.status(400).json({ error: 'username и password обязательны' });
    if (role && !VALID_ROLES.has(role))
      return res.status(400).json({ error: `Недопустимая роль: ${role}` });

    const existing = await queryOne('SELECT ID FROM USERS WHERE USERNAME = ?', [username]);
    if (existing)
      return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });

    // Генерируем числовой ID
    const maxRow = await queryOne('SELECT MAX(CAST(ID AS INTEGER)) AS MX FROM USERS');
    const newId  = String((maxRow?.mx ?? 0) + 1);

    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    await execute(
      'INSERT INTO USERS (ID, USERNAME, PASSWORD, DISPLAY_NAME, ROLE, FILIAL_ID) VALUES (?,?,?,?,?,?)',
      [newId, username.trim(), hash, (displayName ?? username).trim(), role ?? 'viewer',
      filialId != null ? Number(filialId) : null],
    );

    if (Array.isArray(allowedLineIds))    await saveUserLines(newId, allowedLineIds);
    if (Array.isArray(allowedVoltageIds)) await saveUserVoltages(newId, allowedVoltageIds);

    const user = await findUserById(newId);
    res.status(201).json(safeUser(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /users/:id ──────────────────────────────────────────────────────────
router.patch('/users/:id', async (req, res) => {
  try {
    const id     = req.params.id;
    const user   = await findUserById(id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const isSelf = String(req.userId) === String(id);
    const canManage = !!req.userId; // все авторизованные пользователи
    if (!isSelf && !canManage)
      return res.status(403).json({ error: 'Доступ запрещён' });

    const body = req.body ?? {};
    const sets = [];
    const params = [];

    if (canManage) {
      if (body.displayName !== undefined) { sets.push('DISPLAY_NAME = ?'); params.push(String(body.displayName).trim()); }
      if (body.role !== undefined) {
        if (!VALID_ROLES.has(body.role)) return res.status(400).json({ error: `Недопустимая роль: ${body.role}` });
        sets.push('ROLE = ?'); params.push(body.role);
      }
      if (body.filialId !== undefined) { sets.push('FILIAL_ID = ?'); params.push(body.filialId != null ? Number(body.filialId) : null); }
      if (body.username !== undefined) {
        const taken = await queryOne('SELECT ID FROM USERS WHERE USERNAME = ? AND ID != ?', [body.username, id]);
        if (taken) return res.status(409).json({ error: 'Логин уже занят' });
        sets.push('USERNAME = ?'); params.push(String(body.username).trim());
      }
      if (body.allowedLineIds    !== undefined) await saveUserLines(id, Array.isArray(body.allowedLineIds)    ? body.allowedLineIds    : null);
      if (body.allowedVoltageIds !== undefined) await saveUserVoltages(id, Array.isArray(body.allowedVoltageIds) ? body.allowedVoltageIds : null);
    } else {
      if (body.displayName !== undefined) { sets.push('DISPLAY_NAME = ?'); params.push(String(body.displayName).trim()); }
    }

    if (sets.length > 0) {
      params.push(id);
      await execute(`UPDATE USERS SET ${sets.join(', ')} WHERE ID = ?`, params);
    }

    const updated = await findUserById(id);
    res.json(safeUser(updated));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /users/:id ─────────────────────────────────────────────────────────
router.delete('/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (String(id) === String(req.userId))
      return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    const user = await queryOne('SELECT ID FROM USERS WHERE ID = ?', [id]);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    await execute('DELETE FROM USERS WHERE ID = ?', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /users/:id/resetPassword ─────────────────────────────────────────────
router.post('/users/:id/resetPassword', async (req, res) => {
  try {
    const id          = req.params.id;
    const { newPass } = req.body ?? {};
    if (!newPass || newPass.length < 6)
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    const user = await queryOne('SELECT ID FROM USERS WHERE ID = ?', [id]);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    const hash = bcrypt.hashSync(newPass, BCRYPT_ROUNDS);
    await execute('UPDATE USERS SET PASSWORD = ? WHERE ID = ?', [hash, id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /changePassword ──────────────────────────────────────────────────────
router.post('/changePassword', async (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Не авторизован' });
    const { oldPass, newPass } = req.body ?? {};
    if (!oldPass || !newPass)
      return res.status(400).json({ error: 'oldPass и newPass обязательны' });
    if (newPass.length < 6)
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    const user = await findUserById(req.userId);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    const ok = await verifyPass(oldPass, user.password);
    if (!ok) return res.status(403).json({ error: 'Неверный текущий пароль' });
    const hash = bcrypt.hashSync(newPass, BCRYPT_ROUNDS);
    await execute('UPDATE USERS SET PASSWORD = ? WHERE ID = ?', [hash, String(req.userId)]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
