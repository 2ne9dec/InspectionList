'use strict';

/**
 * routes/permissions.js — права ролей.
 *
 * GET /permissions/me         — права текущего пользователя (интерфейс скрывает недоступные действия)
 * GET /rolePermissions        — все права и их распределение по ролям (администратор системы)
 * PUT /rolePermissions/:role  — сохранить права роли (администратор системы)
 */

const { Router } = require('express');
const { PERMISSIONS, EDITABLE_ROLES, OBSERVER_ALLOWED, permissionsOf, savePermissions } = require('../lib/permissions');

const router = Router();

/** Права ролей настраивает только администратор системы (без филиала). */
function requireSystemAdmin(req, res, next) {
  if (!req.userId) return res.status(401).json({ error: 'Не авторизован' });
  if (req.role !== 'admin' || req.filialId != null)
    return res.status(403).json({ error: 'Права ролей настраивает только администратор системы' });
  next();
}

router.get('/permissions/me', (req, res) => {
  if (!req.userId) return res.status(401).json({ error: 'Не авторизован' });
  res.json({ role: req.role, permissions: permissionsOf(req.role, req.filialId) });
});

router.get('/rolePermissions', requireSystemAdmin, (req, res) => {
  const roles = {};
  for (const role of ['admin', ...EDITABLE_ROLES]) roles[role] = permissionsOf(role, req.filialId);
  res.json({
    permissions: PERMISSIONS,
    editableRoles: EDITABLE_ROLES,
    observerAllowed: [...OBSERVER_ALLOWED],
    roles,
  });
});

router.put('/rolePermissions/:role', requireSystemAdmin, async (req, res) => {
  try {
    const { role } = req.params;
    if (!EDITABLE_ROLES.includes(role))
      return res.status(400).json({ error: 'Права этой роли не настраиваются' });
    const keys = Array.isArray(req.body?.permissions) ? req.body.permissions.map(String) : null;
    if (!keys) return res.status(400).json({ error: 'Укажите список прав' });
    const saved = await savePermissions(role, keys);
    res.json({ role, permissions: saved });
  } catch (err) {
    console.error('[permissions]', err.message);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

module.exports = router;
