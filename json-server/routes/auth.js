// routes/auth.js — авторизация и управление пользователями
'use strict';

const { Router }     = require('express');
let rateLimit;
try { rateLimit = require('express-rate-limit'); } catch { rateLimit = null; }
const { readStore, saveStore } = require('../lib/db');
const { hashPass, verifyPass, BCRYPT_ROUNDS } = require('../lib/helpers');
const { signToken }  = require('../lib/auth');
const bcrypt         = require('bcryptjs');

const router = Router();

// ── Допустимые роли ────────────────────────────────────────────────────────────
// admin     — полный доступ, управление пользователями
// director  — директор / главный инженер / зам: все РЭСы, все линии, только чтение управления
// engineer  — служба линий: только 35/110/330 кВ (фильтр по allowedVoltageIds)
// master    — мастер РЭС: только назначенные линии (allowedLineIds)
// viewer    — наблюдатель: только чтение назначенных линий
const VALID_ROLES = new Set(['admin', 'director', 'engineer', 'master', 'viewer']);

// ── Rate limiter ──────────────────────────────────────────────────────────────
const loginLimiter = rateLimit ? rateLimit({
  windowMs:    15 * 60 * 1000,
  max:         5,
  keyGenerator: (req) => `${(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'local')}::${(req.body?.username ?? '').toLowerCase()}`,
  message:     { error: 'Слишком много попыток. Попробуйте через 15 минут.' },
  standardHeaders: true,
  legacyHeaders:   false,
  validate: { xForwardedForHeader: false },
}) : (req, res, next) => next();

function requireAdmin(req, res, next) {
  if (!req.isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });
  next();
}

// GET /users — список без паролей (только admin)
router.get('/users', requireAdmin, (req, res) => {
  try {
    const users = readStore('users');
    res.json(users.map(({ password, ...u }) => u));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /users/me — профиль текущего пользователя
router.get('/users/me', (req, res) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Не авторизован' });
    const users = readStore('users');
    const user  = users.find((u) => String(u.id) === String(req.userId));
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /login — возвращает user + JWT token
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Укажите логин и пароль' });

    const users = readStore('users');
    const user  = users.find((u) => u.username === username);
    if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' });

    const ok = await verifyPass(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Неверный логин или пароль' });

    // Lazy migration: SHA-256 → bcrypt
    const isSha256 = /^[a-f0-9]{64}$/.test(user.password);
    if (isSha256) {
      user.password = bcrypt.hashSync(password, BCRYPT_ROUNDS);
      saveStore('users', users);
    }

    const token = signToken(user);
    const { password: _p, ...safeUser } = user;
    res.json({ ...safeUser, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /users — создать пользователя (только admin)
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, displayName, role, filialId, allowedLineIds, allowedVoltageIds } = req.body ?? {};
    if (!username || !password) return res.status(400).json({ error: 'username и password обязательны' });
    if (role && !VALID_ROLES.has(role)) return res.status(400).json({ error: `Недопустимая роль: ${role}` });

    const users = readStore('users');
    if (users.some((u) => u.username === username)) {
      return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
    }

    const maxId = users.reduce((m, u) => {
      const n = parseInt(u.id, 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);

    const newUser = {
      id:                 String(maxId + 1),
      username:           username.trim(),
      password:           bcrypt.hashSync(password, BCRYPT_ROUNDS),
      displayName:        displayName?.trim() ?? username.trim(),
      role:               role ?? 'viewer',
      filialId:           filialId != null ? Number(filialId) : null,
      allowedLineIds:     Array.isArray(allowedLineIds)    ? allowedLineIds.map(Number)    : null,
      allowedVoltageIds:  Array.isArray(allowedVoltageIds) ? allowedVoltageIds.map(Number) : null,
    };

    users.push(newUser);
    saveStore('users', users);
    const { password: _, ...safeUser } = newUser;
    res.status(201).json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /users/:id — обновление пользователя
router.patch('/users/:id', async (req, res) => {
  try {
    const id    = req.params.id;
    const users = readStore('users');
    const user  = users.find((u) => String(u.id) === String(id));
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const isSelf  = String(req.userId) === String(id);
    const isAdmin = req.isAdmin;
    if (!isSelf && !isAdmin) return res.status(403).json({ error: 'Доступ запрещён' });

    const body = req.body ?? {};

    if (isAdmin) {
      if (body.displayName  !== undefined) user.displayName  = String(body.displayName).trim();
      if (body.role         !== undefined) {
        if (!VALID_ROLES.has(body.role)) return res.status(400).json({ error: `Недопустимая роль: ${body.role}` });
        user.role = body.role;
      }
      if (body.filialId          !== undefined) user.filialId          = body.filialId != null ? Number(body.filialId) : null;
      if (body.allowedLineIds    !== undefined) user.allowedLineIds    = Array.isArray(body.allowedLineIds)    ? body.allowedLineIds.map(Number)    : null;
      if (body.allowedVoltageIds !== undefined) user.allowedVoltageIds = Array.isArray(body.allowedVoltageIds) ? body.allowedVoltageIds.map(Number) : null;
      if (body.username !== undefined) {
        const taken = users.some((u) => u.username === body.username && String(u.id) !== String(id));
        if (taken) return res.status(409).json({ error: 'Логин уже занят' });
        user.username = String(body.username).trim();
      }
    } else {
      // Только displayName для обычного пользователя
      if (body.displayName !== undefined) user.displayName = String(body.displayName).trim();
    }

    saveStore('users', users);
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /users/:id — удалить пользователя (только admin)
router.delete('/users/:id', requireAdmin, (req, res) => {
  try {
    const id = req.params.id;
    if (String(id) === String(req.userId)) {
      return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }
    const users = readStore('users');
    const idx   = users.findIndex((u) => String(u.id) === String(id));
    if (idx === -1) return res.status(404).json({ error: 'Пользователь не найден' });
    users.splice(idx, 1);
    saveStore('users', users);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /users/:id/resetPassword — сброс пароля администратором
router.post('/users/:id/resetPassword', requireAdmin, async (req, res) => {
  try {
    const id          = req.params.id;
    const { newPass } = req.body ?? {};
    if (!newPass || newPass.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    }
    const users = readStore('users');
    const user  = users.find((u) => String(u.id) === String(id));
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    user.password = bcrypt.hashSync(newPass, BCRYPT_ROUNDS);
    saveStore('users', users);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /changePassword — смена пароля самим пользователем
router.post('/changePassword', async (req, res) => {
  try {
    const { id, oldPass, newPass } = req.body ?? {};
    if (!id || !oldPass || !newPass)
      return res.status(400).json({ error: 'id, oldPass, newPass required' });
    const users = readStore('users');
    const user  = users.find((u) => String(u.id) === String(id));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ok = await verifyPass(oldPass, user.password);
    if (!ok) return res.status(403).json({ error: 'Неверный текущий пароль' });

    user.password = hashPass(newPass);
    saveStore('users', users);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
