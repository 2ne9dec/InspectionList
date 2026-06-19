/**
 * json-server/index.js — точка входа
 *
 * Структура:
 *   lib/       — вспомогательные модули (auth, tenancy, db, helpers, ...)
 *   routes/    — маршруты: reference, auth, sheets, defects
 *   seed/      — статические справочники (только чтение)
 *   store/     — динамические данные (users, листки, дефекты)
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const jsonServer = require('json-server');
const express    = require('express');
const { PORT }   = require('./lib/config');
const { authMiddleware }    = require('./lib/auth');
const { tenancyMiddleware } = require('./lib/tenancy');

const server = jsonServer.create();

// ── CORS ───────────────────────────────────────────────────────────────────────
// В production задайте ALLOWED_ORIGINS=https://app.example.com (через запятую).
// В dev значение по умолчанию — http://localhost:5173.
const IS_PROD = process.env.NODE_ENV === 'production';

const rawOrigins = process.env.ALLOWED_ORIGINS || (IS_PROD ? '' : 'http://localhost:5173');
const ALLOWED_ORIGINS = new Set(
  rawOrigins.split(',').map((s) => s.trim()).filter(Boolean)
);

if (IS_PROD && ALLOWED_ORIGINS.size === 0) {
  console.error(
    '[FATAL] ALLOWED_ORIGINS не задан. ' +
    'Установите переменную окружения: ALLOWED_ORIGINS=https://your-domain.com'
  );
  process.exit(1);
}

// ── Middleware ─────────────────────────────────────────────────────────────────
server.use(jsonServer.defaults({}));
server.use(jsonServer.bodyParser);

server.use((req, res, next) => {
  const origin = req.headers.origin || '';

  // Устанавливаем security-заголовки на все ответы
  res.setHeader('X-Content-Type-Options',  'nosniff');
  res.setHeader('X-Frame-Options',         'DENY');
  res.setHeader('Referrer-Policy',         'strict-origin-when-cross-origin');

  if (IS_PROD) {
    // В production — строгий whitelist
    if (ALLOWED_ORIGINS.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin',       origin);
      res.setHeader('Vary',                              'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    // Если origin не в whitelist — CORS-заголовок не выставляем → браузер заблокирует preflight
  } else {
    // В dev — разрешаем только явно заданные origins (localhost:5173 по умолчанию)
    if (!origin || ALLOWED_ORIGINS.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      if (origin) res.setHeader('Vary', 'Origin');
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Filial-Id, X-Is-Admin');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Мультитенантность ─────────────────────────────────────────────────────────
server.use(authMiddleware);    // req.userId, req.filialId, req.isAdmin
server.use(tenancyMiddleware); // req.allowedLineIds

// ── Маршруты по доменам ────────────────────────────────────────────────────────
server.use(require('./routes/reference'));    // GET /filials /voltages /lines ...
server.use(require('./routes/auth'));         // POST /login, GET/PATCH /users, POST /changePassword
server.use(require('./routes/sheets'));       // /inspectionSheets CRUD + clone
server.use(require('./routes/defects'));      // /defectRecords + /defectCounts
server.use(require('./routes/sync'));         // POST /sync/batch

// ── Запуск ────────────────────────────────────────────────────────────────────
server.listen(PORT);
