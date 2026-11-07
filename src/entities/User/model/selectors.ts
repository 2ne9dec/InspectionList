import type { StateSchema } from '@/app/providers/StoreProvider';
import { MANAGER_ROLES, READ_ONLY_ROLES } from './roles';

export const getUserAuthData = (state: StateSchema) => state.user?.authData;
export const getUserInited = (state: StateSchema) => state.user?._inited ?? false;
export const getUserFilialId = (state: StateSchema) => state.user?.authData?.filialId ?? null;
export const getUserDisplayName = (state: StateSchema) => state.user?.authData?.displayName ?? '';
export const getUserRole = (state: StateSchema) => state.user?.authData?.role ?? null;

/** Только просмотр (наблюдатель РУП): кнопки изменения данных скрываются. */
export const getUserIsReadOnly = (state: StateSchema) => {
  const role = state.user?.authData?.role;
  return role != null && READ_ONLY_ROLES.has(role);
};

/** Пользователь без филиала — видит все филиалы, в списках показывается колонка «Филиал». */
export const getUserIsAllFilials = (state: StateSchema) =>
  state.user?.authData != null && state.user.authData.filialId == null;

/** Может управлять пользователями (админ-панель). */
export const getUserCanManageUsers = (state: StateSchema) => {
  const role = state.user?.authData?.role;
  return role != null && MANAGER_ROLES.has(role);
};

/** Главный администратор: управляет пользователями всех филиалов. */
export const getUserIsGlobalManager = (state: StateSchema) =>
  getUserCanManageUsers(state) && getUserIsAllFilials(state);

/** Филиал, выбранный в переключателе (для пользователей без филиала). */
export const getUserViewFilialId = (state: StateSchema) => state.user?.viewFilialId ?? null;

/** Филиал, данные которого сейчас показываются: свой или выбранный в переключателе. */
export const getUserEffectiveFilialId = (state: StateSchema) =>
  state.user?.authData?.filialId ?? state.user?.viewFilialId ?? null;

export const getUserMustChangePassword = (state: StateSchema) =>
  state.user?.authData?.mustChangePassword === true;
