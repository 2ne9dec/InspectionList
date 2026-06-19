'use strict';

/**
 * Оборачивает синхронный Express-хендлер в try-catch.
 * Ошибки передаются в next(err) → глобальный error-handler в index.js.
 */
exports.safe = (fn) => (req, res, next) => {
  try {
    fn(req, res, next);
  } catch (err) {
    console.error('[route error]', req.method, req.path, err.message);
    next(err);
  }
};
