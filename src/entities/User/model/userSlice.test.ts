import { STORAGE_KEYS } from '@/shared/const/storageKeys';
import type { User } from './types';
import { USER_LOCALSTORAGE_KEY, userActions, userReducer } from './userSlice';

const user: User = {
  id: '1',
  username: 'ivanov',
  displayName: 'Иванов И.И.',
  filialId: 2,
  role: 'engineer',
  allowedVoltageIds: [110],
  allowedLineIds: null,
};

describe('userSlice', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('начальное состояние не инициализировано', () => {
    expect(userReducer(undefined, { type: '@@INIT' })).toEqual({ _inited: false });
  });

  it('setAuthData сохраняет пользователя', () => {
    const state = userReducer(undefined, userActions.setAuthData(user));

    expect(state.authData).toEqual(user);
  });

  it('initAuthData восстанавливает пользователя и выбранный филиал из sessionStorage', () => {
    sessionStorage.setItem(USER_LOCALSTORAGE_KEY, JSON.stringify(user));
    sessionStorage.setItem(STORAGE_KEYS.VIEW_FILIAL, '3');

    const state = userReducer(undefined, userActions.initAuthData());

    expect(state.authData).toEqual(user);
    expect(state.viewFilialId).toBe(3);
    expect(state._inited).toBe(true);
  });

  it('initAuthData без сохранённых данных выставляет _inited', () => {
    sessionStorage.setItem(STORAGE_KEYS.VIEW_FILIAL, '0');

    const state = userReducer(undefined, userActions.initAuthData());

    expect(state.authData).toBeUndefined();
    expect(state.viewFilialId).toBeNull();
    expect(state._inited).toBe(true);
  });

  it('initAuthData игнорирует повреждённый JSON, не падая', () => {
    sessionStorage.setItem(USER_LOCALSTORAGE_KEY, '{broken');

    const state = userReducer(undefined, userActions.initAuthData());

    expect(state.authData).toBeUndefined();
    expect(state._inited).toBe(true);
  });

  it('setViewFilialId сохраняет филиал и пишет его в sessionStorage', () => {
    const state = userReducer(undefined, userActions.setViewFilialId(4));

    expect(state.viewFilialId).toBe(4);
    expect(sessionStorage.getItem(STORAGE_KEYS.VIEW_FILIAL)).toBe('4');
  });

  it('setViewFilialId(null) сбрасывает филиал и удаляет его из sessionStorage', () => {
    sessionStorage.setItem(STORAGE_KEYS.VIEW_FILIAL, '4');

    const state = userReducer(undefined, userActions.setViewFilialId(null));

    expect(state.viewFilialId).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.VIEW_FILIAL)).toBeNull();
  });

  it('logout очищает state и sessionStorage', () => {
    sessionStorage.setItem(USER_LOCALSTORAGE_KEY, JSON.stringify(user));
    sessionStorage.setItem(STORAGE_KEYS.VIEW_FILIAL, '4');
    const loggedIn = { authData: user, viewFilialId: 4, _inited: true };

    const state = userReducer(loggedIn, userActions.logout());

    expect(state).toEqual({ authData: undefined, viewFilialId: null, _inited: true });
    expect(sessionStorage.getItem(USER_LOCALSTORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.VIEW_FILIAL)).toBeNull();
  });

  it('экспортирует ключ пользователя из общих STORAGE_KEYS', () => {
    expect(USER_LOCALSTORAGE_KEY).toBe(STORAGE_KEYS.USER);
  });
});
