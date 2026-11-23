import {
  getUserAuthData,
  getUserCanManageUsers,
  getUserDisplayName,
  getUserEffectiveFilialId,
  getUserFilialId,
  getUserInited,
  getUserIsAllFilials,
  getUserIsGlobalManager,
  getUserIsReadOnly,
  getUserMustChangePassword,
  getUserRole,
  getUserViewFilialId,
} from './selectors';
import type { User, UserSchema } from './types';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '1',
    username: 'ivanov',
    displayName: 'Иванов И.И.',
    filialId: 2,
    role: 'engineer',
    allowedVoltageIds: null,
    allowedLineIds: null,
    ...overrides,
  };
}

function makeState(overrides: Partial<UserSchema> = {}) {
  return {
    user: {
      _inited: true,
      authData: makeUser(),
      ...overrides,
    },
  };
}

describe('User selectors', () => {
  it('возвращает безопасные значения при пустом state', () => {
    const empty = {};

    expect(getUserAuthData(empty)).toBeUndefined();
    expect(getUserInited(empty)).toBe(false);
    expect(getUserFilialId(empty)).toBeNull();
    expect(getUserDisplayName(empty)).toBe('');
    expect(getUserRole(empty)).toBeNull();
    expect(getUserIsReadOnly(empty)).toBe(false);
    expect(getUserIsAllFilials(empty)).toBe(false);
    expect(getUserCanManageUsers(empty)).toBe(false);
    expect(getUserViewFilialId(empty)).toBeNull();
    expect(getUserEffectiveFilialId(empty)).toBeNull();
    expect(getUserMustChangePassword(empty)).toBe(false);
  });

  it('читает данные авторизованного пользователя', () => {
    const user = makeUser();
    const state = makeState({ authData: user });

    expect(getUserAuthData(state)).toBe(user);
    expect(getUserFilialId(state)).toBe(2);
    expect(getUserDisplayName(state)).toBe('Иванов И.И.');
    expect(getUserRole(state)).toBe('engineer');
  });

  it('определяет наблюдателя как пользователя только для чтения', () => {
    expect(getUserIsReadOnly(makeState({ authData: makeUser({ role: 'observer' }) }))).toBe(true);
    expect(getUserIsReadOnly(makeState({ authData: makeUser({ role: 'director' }) }))).toBe(false);
    expect(getUserIsReadOnly(makeState({ authData: undefined }))).toBe(false);
  });

  it('считает пользователя «по всем филиалам» только при явном null', () => {
    expect(getUserIsAllFilials(makeState({ authData: makeUser({ filialId: null }) }))).toBe(true);
    expect(getUserIsAllFilials(makeState({ authData: makeUser({ filialId: 2 }) }))).toBe(false);
    expect(getUserIsAllFilials(makeState({ authData: undefined }))).toBe(false);
  });

  it.each<[User['role'], boolean]>([
    ['admin', true],
    ['director_sbpl', true],
    ['director', true],
    ['engineer', false],
    ['master', false],
    ['observer', false],
  ])('getUserCanManageUsers для роли %s → %s', (role, expected) => {
    expect(getUserCanManageUsers(makeState({ authData: makeUser({ role }) }))).toBe(expected);
  });

  it('главный администратор — менеджер без филиала', () => {
    const globalAdmin = makeState({ authData: makeUser({ role: 'admin', filialId: null }) });
    const filialAdmin = makeState({ authData: makeUser({ role: 'admin', filialId: 1 }) });

    expect(getUserIsGlobalManager(globalAdmin)).toBe(true);
    expect(getUserIsGlobalManager(filialAdmin)).toBe(false);
  });

  it('эффективный филиал: свой филиал важнее выбранного в переключателе', () => {
    expect(getUserEffectiveFilialId(makeState({
      authData: makeUser({ filialId: 2 }),
      viewFilialId: 5,
    }))).toBe(2);

    expect(getUserEffectiveFilialId(makeState({
      authData: makeUser({ filialId: null }),
      viewFilialId: 5,
    }))).toBe(5);

    expect(getUserEffectiveFilialId(makeState({
      authData: makeUser({ filialId: null }),
      viewFilialId: null,
    }))).toBeNull();
  });

  it('getUserFilialId не подменяет филиал выбранным viewFilialId', () => {
    const state = makeState({ authData: makeUser({ filialId: null }), viewFilialId: 5 });

    expect(getUserFilialId(state)).toBeNull();
    expect(getUserViewFilialId(state)).toBe(5);
  });

  it('mustChangePassword учитывается только при значении true', () => {
    expect(getUserMustChangePassword(makeState({ authData: makeUser({ mustChangePassword: true }) }))).toBe(true);
    expect(getUserMustChangePassword(makeState({ authData: makeUser({ mustChangePassword: false }) }))).toBe(false);
    expect(getUserMustChangePassword(makeState({ authData: makeUser() }))).toBe(false);
  });

  it('возвращает флаг инициализации из state', () => {
    expect(getUserInited({ user: { _inited: true } })).toBe(true);
    expect(getUserInited({ user: { _inited: false } })).toBe(false);
  });
});
