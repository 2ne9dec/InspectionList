/**
 * Роль пользователя.
 *  admin    — администратор: без филиала — главный (все филиалы), с филиалом — администратор филиала;
 *  director_sbpl / engineer_sbpl — руководитель и инженер СБПЛСиОИ;
 *  director / engineer / master / electrician — руководитель, инженер, мастер, электромонтёр службы линий (СЛ);
 *  observer — наблюдатель РУП: видит все филиалы, только просмотр.
 */
export type UserRole =
  | 'admin' | 'director_sbpl' | 'engineer_sbpl' | 'director' | 'engineer' | 'master' | 'electrician' | 'observer';

export interface User {
  id: string;
  username: string;
  displayName: string;
  /** null — пользователь без филиала (главный администратор, наблюдатель РУП) */
  filialId: number | null;
  role: UserRole;
  allowedVoltageIds: number[] | null;
  allowedLineIds: number[] | null;
  /** Временный пароль: при входе пользователь обязан его сменить */
  mustChangePassword?: boolean;
  /** JWT access-token, возвращается сервером при /login */
  token?: string;
}

export interface UserSchema {
  authData?: User;
  /** Филиал, выбранный пользователем без филиала (наблюдатель РУП, главный администратор). */
  viewFilialId?: number | null;
  _inited: boolean;
}

/** Пользователь без чувствительных данных */
export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  filialId: number | null;
  role: UserRole;
  allowedVoltageIds: number[] | null;
  allowedLineIds: number[] | null;
  mustChangePassword?: boolean;
}
