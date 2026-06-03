/**
 * auth.js — middleware извлечения контекста пользователя из запроса.
 *
 * Для mock-сервера используем упрощённую схему без реального JWT:
 * клиент передаёт идентификаторы через HTTP-заголовки (удобно для SPA
 * с interceptor'ами) или query-параметры (удобно при отладке в браузере).
 *
 * Заголовки (приоритет):
 *   X-User-Id    — числовой id пользователя
 *   X-Filial-Id  — числовой id филиала (мультитенантность)
 *   X-Is-Admin   — "true" если пользователь — администратор
 *
 * Dev-fallback (query params):
 *   ?_userId=N &_filialId=N &_isAdmin=true
 *
 * После middleware в req доступны:
 *   req.userId   {number|null}
 *   req.filialId {number|null}
 *   req.isAdmin  {boolean}
 */

'use strict';

function authMiddleware(req, res, next) {
  // Читаем из заголовков (приоритет) или query params (dev fallback)
  const rawUserId   = req.headers['x-user-id']   ?? req.query._userId;
  const rawFilialId = req.headers['x-filial-id'] ?? req.query._filialId;
  const rawIsAdmin  = req.headers['x-is-admin']  ?? req.query._isAdmin;

  req.userId   = rawUserId   ? Number(rawUserId)   : null;
  req.filialId = rawFilialId ? Number(rawFilialId) : null;
  req.isAdmin  = rawIsAdmin === 'true' || rawIsAdmin === true;

  // Очищаем dev-параметры из query чтобы не мешали роутам
  delete req.query._userId;
  delete req.query._filialId;
  delete req.query._isAdmin;

  next();
}

module.exports = { authMiddleware };
