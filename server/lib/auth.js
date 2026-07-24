'use strict';

/**
 * auth.js — JWT-middleware извлечения контекста пользователя.
 *
 * Клиент передаёт: Authorization: Bearer <token>
 * Сервер верифицирует подпись HS256 и читает payload:
 *   payload.sub      → req.userId
 *   payload.filialId → req.filialId
 *   payload.role     → req.isAdmin (role === 'admin')
 *
 * Публичные маршруты (POST /login) не требуют токена.
 *
 * VITE_ENABLE_MOCK_AUTH=true (dev) — совместимый режим без токена,
 * читает X-User-Id / X-Filial-Id для локальной разработки без логина.
 */

let jwt;
try { jwt = require('jsonwebtoken'); } catch { jwt = null; }

// ── Валидация конфигурации ────────────────────────────────────────────────────
const IS_PROD   = process.env.NODE_ENV === 'production';
const MOCK_AUTH = process.env.VITE_ENABLE_MOCK_AUTH === 'true';

if (IS_PROD && MOCK_AUTH) {
  console.error(
    '[FATAL] VITE_ENABLE_MOCK_AUTH=true запрещён в production — ' +
    'любой клиент может подделать заголовки и получить admin-права. ' +
    'Установите JWT_SECRET и уберите эту переменную.'
  );
  process.exit(1);
}

const JWT_SECRET  = process.env.JWT_SECRET || (IS_PROD ? null : 'dev-secret-change-in-production');
const JWT_EXPIRES = process.env.JWT_EXPIRES || '8h';

if (IS_PROD && (!JWT_SECRET || JWT_SECRET.length < 32)) {
  console.error(
    '[FATAL] JWT_SECRET не задан или короче 32 символов. ' +
    'Сгенерируйте: openssl rand -hex 32'
  );
  process.exit(1);
}
if (!IS_PROD && !process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET не задан — используется небезопасный dev-ключ. Задайте JWT_SECRET в .env');
}

// Маршруты, доступные без токена
const PUBLIC_PATHS = new Set(['/login']);

function authMiddleware(req, res, next) {
  // Публичные маршруты — пропускаем без проверки
  if (PUBLIC_PATHS.has(req.path) && req.method === 'POST') {
    req.userId = null; req.filialId = null; req.isAdmin = false;
    return next();
  }

  // Dev-режим без JWT (VITE_ENABLE_MOCK_AUTH=true)
  if (MOCK_AUTH) {
    const rawUserId   = req.headers['x-user-id']   ?? req.query._userId;
    const rawFilialId = req.headers['x-filial-id'] ?? req.query._filialId;
    const rawIsAdmin  = req.headers['x-is-admin']  ?? req.query._isAdmin;
    req.userId   = rawUserId   ? Number(rawUserId)   : null;
    req.filialId = rawFilialId ? Number(rawFilialId) : null;
    req.isAdmin  = rawIsAdmin === 'true' || rawIsAdmin === true;
    delete req.query._userId; delete req.query._filialId; delete req.query._isAdmin;
    return next();
  }

  // Читаем Bearer token
  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    req.userId = null; req.filialId = null; req.isAdmin = false;
    return next(); // роуты сами решают, нужна ли авторизация
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId            = payload.sub              ?? null;
    req.filialId          = payload.filialId         != null ? Number(payload.filialId)        : null;
    req.role              = payload.role             ?? 'viewer';
    req.isAdmin           = payload.role             === 'admin';
    req.allowedLineIds    = Array.isArray(payload.allowedLineIds)    ? payload.allowedLineIds    : null;
    req.allowedVoltageIds = Array.isArray(payload.allowedVoltageIds) ? payload.allowedVoltageIds : null;
    next();
  } catch {
    return res.status(401).json({ error: 'Токен недействителен или истёк' });
  }
}

/** Генерирует access-токен для пользователя. */
function signToken(user) {
  return jwt.sign(
    {
      sub:               user.id,
      filialId:          user.filialId,
      role:              user.role,
      allowedLineIds:    user.allowedLineIds    ?? null,
      allowedVoltageIds: user.allowedVoltageIds ?? null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES },
  );
}

module.exports = { authMiddleware, signToken, JWT_SECRET };
