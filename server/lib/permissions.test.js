// @vitest-environment node
'use strict';

process.env.FB_PASSWORD = process.env.FB_PASSWORD || 'test-password';

const {
  PERMISSIONS,
  PERMISSION_KEYS,
  EDITABLE_ROLES,
  OBSERVER_ALLOWED,
  permissionsOf,
  hasPermission,
  requirePermission,
} = require('./permissions');

function mockRes() {
  const res = { statusCode: 200, body: null };
  res.status = vi.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = vi.fn((body) => {
    res.body = body;
    return res;
  });
  return res;
}

describe('permissions', () => {
  describe('PERMISSIONS', () => {
    it('содержит уникальные ключи и непустые названия', () => {
      const keys = PERMISSIONS.map((p) => p.key);

      expect(new Set(keys).size).toBe(keys.length);
      expect(keys).toContain('sheets.create');
      expect(keys).toContain('defects.fix');
      expect(keys).toContain('journal.conclusion');
      expect(keys).toContain('export.excel');
      for (const permission of PERMISSIONS) {
        expect(permission.group).toBeTruthy();
        expect(permission.label).toBeTruthy();
      }
      expect(PERMISSION_KEYS.size).toBe(PERMISSIONS.length);
    });

    it('не включает не настраиваемые действия', () => {
      expect(PERMISSION_KEYS.has('sheets.delete')).toBe(false);
    });
  });

  describe('роли', () => {
    it('настраиваемые роли включают наблюдателя, но не администратора', () => {
      expect(EDITABLE_ROLES).toContain('observer');
      expect(EDITABLE_ROLES).toContain('electrician');
      expect(EDITABLE_ROLES).not.toContain('admin');
    });

    it('наблюдателю разрешена только выгрузка в Excel', () => {
      expect([...OBSERVER_ALLOWED]).toEqual(['export.excel']);
    });
  });

  describe('permissionsOf', () => {
    it('администратор системы получает все права и удаление листков', () => {
      const permissions = permissionsOf('admin', null);

      expect(permissions).toEqual([...PERMISSION_KEYS, 'sheets.delete']);
      expect(permissions).toContain('export.excel');
      expect(permissions).toContain('sheets.delete');
    });

    it('администратор филиала получает все права, кроме удаления листков', () => {
      const permissions = permissionsOf('admin', 2);

      expect(permissions).toEqual([...PERMISSION_KEYS]);
      expect(permissions).not.toContain('sheets.delete');
    });

    it('филиал, переданный как undefined, считается отсутствующим', () => {
      expect(permissionsOf('admin', undefined)).toContain('sheets.delete');
    });

    it('неизвестная роль без загруженного кэша не имеет прав', () => {
      expect(permissionsOf('unknown-role', 2)).toEqual([]);
    });
  });

  describe('hasPermission', () => {
    it('проверяет право администратора с учётом филиала', () => {
      expect(hasPermission('admin', 'export.excel', null)).toBe(true);
      expect(hasPermission('admin', 'sheets.delete', null)).toBe(true);
      expect(hasPermission('admin', 'sheets.delete', 2)).toBe(false);
    });

    it('для роли без загруженных прав возвращает false', () => {
      expect(hasPermission('unknown-role', 'export.excel', 2)).toBe(false);
    });
  });

  describe('requirePermission', () => {
    it('пропускает администратора', () => {
      const next = vi.fn();

      requirePermission('export.excel', 'sheets.delete')(
        { role: 'admin', filialId: null },
        mockRes(),
        next,
      );

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('запрещает действие без нужного права и сообщает ключ', () => {
      const res = mockRes();
      const next = vi.fn();

      requirePermission('defects.fix')(
        { role: 'unknown-role', filialId: 2 },
        res,
        next,
      );

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({
        error: 'Недостаточно прав для этого действия',
        permission: 'defects.fix',
      });
    });
  });
});
