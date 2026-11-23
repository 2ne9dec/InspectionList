import { configureStore } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';
import type { User } from '@/entities/User';
import { userReducer } from '@/entities/User/model/userSlice';
import { loginByUsername } from './loginThunk';

const mocks = vi.hoisted(() => ({
  authenticateOffline: vi.fn(),
  hasOfflineCredentials: vi.fn(),
  saveOfflineCredentials: vi.fn(),
}));

vi.mock('@/entities/User', () => ({
  authenticateOffline: mocks.authenticateOffline,
  hasOfflineCredentials: mocks.hasOfflineCredentials,
  saveOfflineCredentials: mocks.saveOfflineCredentials,
  userActions: {
    setAuthData: (payload: User) => ({ type: 'user/setAuthData', payload }),
  },
}));

const user: User = {
  id: '7',
  username: 'ivanov',
  displayName: 'Иванов И.И.',
  filialId: 2,
  role: 'engineer',
  allowedVoltageIds: null,
  allowedLineIds: null,
};

const fetchMock = vi.fn();

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: vi.fn().mockResolvedValue(body) } as unknown as Response;
}

function createStore() {
  return configureStore({ reducer: { user: userReducer } });
}

describe('loginByUsername', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.stubGlobal('fetch', fetchMock);
    mocks.saveOfflineCredentials.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('входит через сервер, сохраняет токен и пользователя без токена', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ...user, token: 'jwt-token' }));
    const store = createStore();

    const result = await store.dispatch(loginByUsername({
      username: ' IVANOV ',
      password: 'Password1',
      filialId: '2',
    }));

    expect(result.type).toBe('auth/loginByUsername/fulfilled');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/login'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'ivanov', password: 'Password1', filialId: '2' }),
      }),
    );

    expect(store.getState().user.authData).toEqual(user);
    expect(sessionStorage.getItem(STORAGE_KEYS.TOKEN)).toBe('jwt-token');
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEYS.USER) ?? '{}')).toEqual(user);
    expect(mocks.saveOfflineCredentials).toHaveBeenCalledWith(user, 'Password1', 'jwt-token');
  });

  it('возвращает ошибку сервера без перехода в офлайн', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'Неверный пароль' }, false));
    const store = createStore();

    const result = await store.dispatch(loginByUsername({
      username: 'ivanov',
      password: 'wrong',
    }));

    expect(result.type).toBe('auth/loginByUsername/rejected');
    expect(result.payload).toBe('Неверный пароль');
    expect(mocks.authenticateOffline).not.toHaveBeenCalled();
    expect(store.getState().user.authData).toBeUndefined();
    expect(sessionStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
  });

  it('использует сообщение по умолчанию, если сервер не вернул текст ошибки', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: vi.fn().mockRejectedValue(new Error('bad json')) } as unknown as Response);
    const store = createStore();

    const result = await store.dispatch(loginByUsername({ username: 'ivanov', password: 'wrong' }));

    expect(result.type).toBe('auth/loginByUsername/rejected');
    expect(result.payload).toBe('Ошибка авторизации');
  });

  it('при недоступном сервере входит по сохранённым офлайн-данным', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    mocks.authenticateOffline.mockResolvedValue({ user, token: 'cached-jwt' });
    const store = createStore();

    const result = await store.dispatch(loginByUsername({
      username: 'ivanov',
      password: 'Password1',
      filialId: '2',
    }));

    expect(result.type).toBe('auth/loginByUsername/fulfilled');
    expect(mocks.authenticateOffline).toHaveBeenCalledWith('ivanov', 'Password1', '2');
    expect(store.getState().user.authData).toEqual(user);
    expect(sessionStorage.getItem(STORAGE_KEYS.TOKEN)).toBe('cached-jwt');
    expect(mocks.saveOfflineCredentials).not.toHaveBeenCalled();
  });

  it('не пускает офлайн пользователя с временным паролем', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    mocks.authenticateOffline.mockResolvedValue({ user: { ...user, mustChangePassword: true } });
    const store = createStore();

    const result = await store.dispatch(loginByUsername({ username: 'ivanov', password: 'Password1' }));

    expect(result.type).toBe('auth/loginByUsername/rejected');
    expect(result.payload).toBe('Сначала смените пароль при доступном сервере.');
    expect(store.getState().user.authData).toBeUndefined();
  });

  it('объясняет, что первый вход требует сервера', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    mocks.authenticateOffline.mockResolvedValue(null);
    mocks.hasOfflineCredentials.mockReturnValue(false);
    const store = createStore();

    const result = await store.dispatch(loginByUsername({ username: ' unknown ', password: 'Password1' }));

    expect(result.type).toBe('auth/loginByUsername/rejected');
    expect(result.payload).toBe(
      'Сервер недоступен. Первый вход должен быть выполнен при доступном сервере — после этого вход будет работать без сети.',
    );
    expect(sessionStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
  });

  it('сообщает, что для пользователя нет сохранённого входа', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    mocks.authenticateOffline.mockResolvedValue(null);
    mocks.hasOfflineCredentials.mockReturnValue(true);
    const store = createStore();

    const result = await store.dispatch(loginByUsername({ username: 'unknown', password: 'Password1' }));

    expect(result.type).toBe('auth/loginByUsername/rejected');
    expect(result.payload).toBe(
      'Сервер недоступен. Для «unknown» нет сохранённого входа на этом устройстве.',
    );
  });
});
