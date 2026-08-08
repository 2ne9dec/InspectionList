'use strict';

/**
 * index.js -- точка входа сервера InspectionList (Firebird).
 *
 * Настройка:
 *   Создать файл server/.env
 *   Запустить: node server/index.js
 *   Или через PM2: pm2 start server/index.js --name inspectionlist
 */

const path = require('path');
const fs   = require('fs');

// Если запущен через pkg exe — __dirname смотрит внутрь exe, а не на файловую систему
const isPackaged = typeof process.pkg !== 'undefined';
// Базовая директория: рядом с exe в pkg, корень проекта в dev
const baseDir = isPackaged ? path.dirname(process.execPath) : path.join(__dirname, '..');
require('dotenv').config({
  path: isPackaged
    ? path.join(baseDir, '.env')          // рядом с exe
    : path.join(__dirname, '.env'),        // server/.env в dev
});

const express = require('express');
const { PORT } = require('./lib/config');
const { authMiddleware, requireAuth } = require('./lib/auth');
const { tenancyMiddleware, initTenancy } = require('./lib/tenancy');
const { testConnection } = require('./lib/fbDb');

const app      = express();
const distPath = path.join(baseDir, 'dist');

// ── Фильтр IP ─────────────────────────────────────────────────────────────────
// Блокировка нежелательных IP (например, виртуальные адаптеры)
const ALLOWED_HOST = process.env.BIND_HOST;
if (ALLOWED_HOST && ALLOWED_HOST !== '0.0.0.0') {
  app.use((req, res, next) => {
    const localAddr = (req.socket.localAddress || '').replace('::ffff:', '');
    if (localAddr !== ALLOWED_HOST && localAddr !== '127.0.0.1') {
      return res.status(403).end();
    }
    next();
  });
}

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: false }));

// ── CORS ──────────────────────────────────────────────────────────────────────
// Внутреннее приложение — разрешаем все origin. JWT защищает API.
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // CSP — внутреннее приложение, разрешаем только своё происхождение + inline стили/скрипты
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; "
    + "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
    + "style-src 'self' 'unsafe-inline'; "
    + "img-src 'self' data: blob: https://*.tile.openstreetmap.org; "
    + "connect-src 'self'; "
    + "worker-src blob:;"
  );
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  if (origin) res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-User-Id, X-Filial-Id, X-Is-Admin');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Статика React (prod) ──────────────────────────────────────────────────────
// Отдаём JS/CSS/картинки до auth guard — токен не нужен
if (fs.existsSync(distPath)) app.use(express.static(distPath));

// ── Авторизация ───────────────────────────────────────────────────────────────
app.use(authMiddleware);
app.use(tenancyMiddleware);

// Guard пропускает:
//   1. POST /login — публичный маршрут
//   2. GET-запросы браузера (Accept: text/html) — обновление страницы SPA,
//      они всё равно попадут на SPA fallback и получат index.html
// Всё остальное (fetch API без токена) получает 401.
app.use((req, res, next) => {
  if (req.path === '/login' && req.method === 'POST') return next();
  if (req.method === 'GET' && req.accepts('html')) return next();
  return requireAuth(req, res, next);
});

// ── API роуты ─────────────────────────────────────────────────────────────────
app.use(require('./routes/reference'));
app.use(require('./routes/auth'));
app.use(require('./routes/sheets'));
app.use(require('./routes/defects'));
app.use(require('./routes/sync'));

// ── SPA fallback ──────────────────────────────────────────────────────────────
// Все неизвестные GET → index.html; React Router обработает маршрут.
// Работает и при обновлении страницы (F5) без токена — показывает экран входа.
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// ── Глобальный обработчик ошибок ──────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ERROR]', req.method, req.path, err.message);
  res.status(500).json({ error: err.message || 'Внутренняя ошибка сервера' });
});

// ── Запуск ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    console.log('[boot] Подключение к Firebird...');
    await testConnection();
    console.log('[boot] Firebird OK');
    await initTenancy();
    const BIND_HOST = process.env.BIND_HOST || '0.0.0.0';
    app.listen(PORT, BIND_HOST, () => {
      const os = require('os');
      const lanIps = Object.values(os.networkInterfaces())
        .flat()
        .filter((i) => i.family === 'IPv4' && !i.internal)
        .map((i) => i.address);
      console.log(`[boot] Сервер запущен: http://0.0.0.0:${PORT}`);
      lanIps
        .filter((ip) => !ip.startsWith('10.255.'))
        .forEach((ip) => console.log(`[boot] Локальная сеть:  http://${ip}:${PORT}`));
    });
  } catch (err) {
    console.error('[FATAL] Не удалось запустить сервер:', err.message);
    console.error('  Проверьте настройки в server/.env');
    process.exit(1);
  }
}

start();
