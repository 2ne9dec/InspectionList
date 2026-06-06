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

// ── Middleware ─────────────────────────────────────────────────────────────────
server.use(jsonServer.defaults({}));
server.use(jsonServer.bodyParser);

server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin',  '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-User-Id, X-Filial-Id, X-Is-Admin');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
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
