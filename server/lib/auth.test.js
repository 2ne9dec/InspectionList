// @vitest-environment node
'use strict';

process.env.NODE_ENV = 'test';
process.env.VITE_ENABLE_MOCK_AUTH = 'false';
process.env.JWT_SECRET = 'test-secret-0123456789abcdef0123456789abcdef';

const jwt = require('jsonwebtoken');
const {
  authMiddleware,
  signToken,
  JWT_SECRET,
  requireAuth,
  requireRole,
  blockReadOnlyWrites,
  blockUntilPasswordChanged,
} = require('./auth');

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

function mockReq(overrides = {}) {
  return {
    method: 'GET',
    path: '/defectRecords',
    headers: {},
    query: {},
    ...overrides,
  };
}

describe('auth', () => {
  describe('signToken', () => {
    it('кладёт в токен пользователя, филиал, роль, ограничения и флаг смены пароля', () => {
      const token = signToken({
        id: 7,
        filialId: 2,
        role: 'engineer',
        allowedLineIds: [1, 2],
        allowedVoltageIds: [3],
        mustChangePassword: true,
      });

      const payload = jwt.verify(token, JWT_SECRET);

      expect(payload).toMatchObject({
        sub: 7,
        filialId: 2,
        role: 'engineer',
        allowedLineIds: [1, 2],
        allowedVoltageIds: [3],
        mcp: true,
      });
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('ставит mcp=false и null-ограничения по умолчанию', () => {
      const payload = jwt.verify(
        signToken({ id: 1, filialId: null, role: 'admin' }),
        JWT_SECRET,
      );

      expect(payload.mcp).toBe(false);
      expect(payload.allowedLineIds).toBeNull();
      expect(payload.allowedVoltageIds).toBeNull();
    });
  });

  describe('authMiddleware', () => {
    it('пропускает публичный POST /login без токена', () => {
      const req = mockReq({ method: 'POST', path: '/login' });
      const res = mockRes();
      const next = vi.fn();

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.userId).toBeNull();
      expect(req.filialId).toBeNull();
    });

    it('без токена передаёт управление роуту с пустым пользователем', () => {
      const req = mockReq();
      const next = vi.fn();

      authMiddleware(req, mockRes(), next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.userId).toBeNull();
      expect(req.filialId).toBeNull();
    });

    it('читает пользователя из валидного Bearer-токена', () => {
      const token = signToken({
        id: 42,
        filialId: '2',
        role: 'master',
        allowedLineIds: [10, 11],
        allowedVoltageIds: null,
        mustChangePassword: true,
      });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const res = mockRes();
      const next = vi.fn();

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect(req.userId).toBe(42);
      expect(req.filialId).toBe(2);
      expect(req.role).toBe('master');
      expect(req.allowedLineIds).toEqual([10, 11]);
      expect(req.allowedVoltageIds).toBeNull();
      expect(req.mustChangePassword).toBe(true);
    });

    it('возвращает 401 для недействительного токена', () => {
      const req = mockReq({ headers: { authorization: 'Bearer broken' } });
      const res = mockRes();
      const next = vi.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ error: 'Токен недействителен или истёк' });
    });

    it('возвращает 401 для токена, подписанного другим секретом', () => {
      const token = jwt.sign({ sub: 1 }, 'another-secret');
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      const res = mockRes();
      const next = vi.fn();

      authMiddleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
    });
  });

  describe('requireAuth', () => {
    it('отклоняет запрос без пользователя', () => {
      const res = mockRes();
      const next = vi.fn();

      requireAuth({ userId: null }, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ error: 'Не авторизован' });
    });

    it('пропускает авторизованного пользователя', () => {
      const next = vi.fn();

      requireAuth({ userId: 1 }, mockRes(), next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('requireRole', () => {
    it('пропускает роль из списка', () => {
      const next = vi.fn();

      requireRole('admin', 'director')({ role: 'director' }, mockRes(), next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('запрещает роль вне списка и указывает её в ошибке', () => {
      const res = mockRes();
      const next = vi.fn();

      requireRole('admin')({ role: 'master' }, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body.error).toContain('master');
    });
  });

  describe('blockReadOnlyWrites', () => {
    it('разрешает наблюдателю чтение', () => {
      const next = vi.fn();

      blockReadOnlyWrites({ role: 'observer', method: 'GET', path: '/sheets' }, mockRes(), next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('запрещает наблюдателю изменяющие запросы', () => {
      const res = mockRes();
      const next = vi.fn();

      blockReadOnlyWrites({ role: 'observer', method: 'PATCH', path: '/defectRecords/1' }, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({ error: 'Режим только для просмотра' });
    });

    it('разрешает наблюдателю смену собственного пароля', () => {
      const next = vi.fn();

      blockReadOnlyWrites(
        { role: 'observer', method: 'POST', path: '/ChangePassword' },
        mockRes(),
        next,
      );

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('не ограничивает остальные роли', () => {
      const next = vi.fn();

      blockReadOnlyWrites({ role: 'engineer', method: 'POST', path: '/sheets' }, mockRes(), next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('blockUntilPasswordChanged', () => {
    it('блокирует данные до смены временного пароля', () => {
      const res = mockRes();
      const next = vi.fn();

      blockUntilPasswordChanged(
        { mustChangePassword: true, method: 'GET', path: '/sheets' },
        res,
        next,
      );

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(403);
      expect(res.body).toEqual({
        error: 'Необходимо сменить временный пароль',
        code: 'PASSWORD_CHANGE_REQUIRED',
      });
    });

    it('разрешает смену пароля и просмотр собственного профиля', () => {
      const next = vi.fn();

      blockUntilPasswordChanged(
        { mustChangePassword: true, method: 'POST', path: '/changepassword' },
        mockRes(),
        next,
      );
      blockUntilPasswordChanged(
        { mustChangePassword: true, method: 'GET', path: '/users/me' },
        mockRes(),
        next,
      );

      expect(next).toHaveBeenCalledTimes(2);
    });

    it('не мешает пользователю без временного пароля', () => {
      const next = vi.fn();

      blockUntilPasswordChanged(
        { mustChangePassword: false, method: 'GET', path: '/sheets' },
        mockRes(),
        next,
      );

      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
