import { MANAGER_ROLES, READ_ONLY_ROLES } from './roles';
import type { UserSchema } from './types';

/** Минимальный срез состояния: entities не зависит от app. */
interface UserRootState {
  user?: UserSchema;
}

export const getUserAuthData = (state: UserRootState) => state.user?.authData;
export const getUserInited = (state: UserRootState) => state.user?._inited ?? false;
export const getUserFilialId = (state: UserRootState) => state.user?.authData?.filialId ?? null;
export const getUserDisplayName = (state: UserRootState) => state.user?.authData?.displayName ?? '';
export const getUserRole = (state: UserRootState) => state.user?.authData?.role ?? null;

/** Только просмотр (наблюдатель РУП): кнопки изменения данных скрываются. */
export const getUserIsReadOnly = (state: UserRootState) => {
  const role = state.user?.authData?.role;
  return role != null && READ_ONLY_ROLES.has(role);
};

/** Пользователь без филиала — видит все филиалы, в списках показывается колонка «Филиал». */
export const getUserIsAllFilials = (state: UserRootState) =>
  state.user?.authData != null && state.user.authData.filialId == null;

/** Может управлять пользователями (админ-панель). */
export const getUserCanManageUsers = (state: UserRootState) => {
  const role = state.user?.authData?.role;
  return role != null && MANAGER_ROLES.has(role);
};

/** Главный администратор: управляет пользователями всех филиалов. */
export const getUserIsGlobalManager = (state: UserRootState) =>
  getUserCanManageUsers(state) && getUserIsAllFilials(state);

/** Филиал, выбранный в переключателе (для пользователей без филиала). */
export const getUserViewFilialId = (state: UserRootState) => state.user?.viewFilialId ?? null;

/** Филиал, данные которого сейчас показываются: свой или выбранный в переключателе. */
export const getUserEffectiveFilialId = (state: UserRootState) =>
  state.user?.authData?.filialId ?? state.user?.viewFilialId ?? null;

export const getUserMustChangePassword = (state: UserRootState) =>
  state.user?.authData?.mustChangePassword === true;
