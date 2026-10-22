/** Роль пользователя — все пользователи имеют полный доступ на свой филиал */
export type UserRole = 'director' | 'engineer' | 'master' | 'viewer';

export interface User {
  id: string;
  username: string;
  displayName: string;
  filialId: number;                  // всегда привязан к филиалу
  role: UserRole;
  allowedVoltageIds: number[] | null;
  allowedLineIds: number[] | null;
  /** JWT access-token, возвращается сервером при /login */
  token?: string;
}

export interface UserSchema {
  authData?: User;
  _inited: boolean;
}

/** Пользователь без чувствительных данных */
export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  filialId: number;
  role: UserRole;
  allowedVoltageIds: number[] | null;
  allowedLineIds: number[] | null;
}
