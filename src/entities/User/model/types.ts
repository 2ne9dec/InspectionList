/**
 * Роли пользователей:
 *   admin    — полный доступ + управление пользователями
 *   director — директор / главный инженер / зам: все линии своего филиала
 *   engineer — служба линий: только классы кВ из allowedVoltageIds (35/110/330 кВ)
 *   master   — мастер РЭС: только линии из allowedLineIds
 *   viewer   — наблюдатель: только чтение назначенных линий
 */
export type UserRole = 'admin' | 'director' | 'engineer' | 'master' | 'viewer';

export interface User {
  id: string;
  username: string;
  displayName: string;
  filialId: number | null;          // null = admin (все филиалы)
  role: UserRole;
  /** Ограничение по классам напряжения (engineer). null = все напряжения */
  allowedVoltageIds: number[] | null;
  /** Ограничение по конкретным линиям (master, viewer). null = все линии филиала */
  allowedLineIds: number[] | null;
  /** JWT access-token, возвращается сервером при /login */
  token?: string;
}

export interface UserSchema {
  authData?: User;
  _inited: boolean;
}

/** Пользователь без чувствительных данных (для admin-панели) */
export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  filialId: number | null;
  role: UserRole;
  allowedVoltageIds: number[] | null;
  allowedLineIds: number[] | null;
}
