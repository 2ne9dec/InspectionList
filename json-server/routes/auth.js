// routes/auth.js — авторизация и пользователи
const { Router } = require('express');
const { readStore, saveStore } = require('../lib/db');
const { hashPass }             = require('../lib/helpers');

const router = Router();

// GET /users — список без паролей
router.get('/users', (req, res) => {
  const users = readStore('users');
  res.json(users.map(({ password, ...u }) => u));
});

// POST /login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Укажите логин и пароль' });
  const users = readStore('users');
  const user  = users.find((u) => u.username === username && u.password === hashPass(password));
  if (!user) return res.status(401).json({ error: 'Неверный логин или пароль' });
  const { password: _p, ...safeUser } = user;
  res.json(safeUser);
});

// PATCH /users/:id — обновление профиля
router.patch('/users/:id', (req, res) => {
  const id      = req.params.id;
  const allowed = new Set(['displayName']);
  const users   = readStore('users');
  const user    = users.find((u) => String(u.id) === String(id));
  if (!user) return res.status(404).json({ error: 'Not found' });
  for (const [k, v] of Object.entries(req.body ?? {})) {
    if (allowed.has(k)) user[k] = v;
  }
  saveStore('users', users);
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

// POST /changePassword
router.post('/changePassword', (req, res) => {
  const { id, oldPass, newPass } = req.body ?? {};
  if (!id || !oldPass || !newPass)
    return res.status(400).json({ error: 'id, oldPass, newPass required' });
  const users = readStore('users');
  const user  = users.find((u) => String(u.id) === String(id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.password !== hashPass(oldPass))
    return res.status(403).json({ error: 'Неверный текущий пароль' });
  user.password = hashPass(newPass);
  saveStore('users', users);
  res.json({ ok: true });
});

module.exports = router;
