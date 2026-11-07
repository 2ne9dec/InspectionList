import type { UserRole } from './types';

/** Роли «только просмотр». Запрет изменений проверяется и на сервере. */
export const READ_ONLY_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['observer']);

/** Роли, которым доступна админ-панель пользователей. */
export const MANAGER_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['admin', 'director']);

/** Название роли для интерфейса. */
export function getRoleLabel(role: UserRole, filialId: number | null): string {
  switch (role) {
    case 'admin':    return filialId == null ? 'Администратор системы' : 'Администратор филиала';
    case 'director': return 'Руководитель';
    case 'engineer': return 'Инженер';
    case 'master':   return 'Мастер';
    case 'viewer':   return 'Пользователь';
    case 'observer': return 'Наблюдатель РУП (только просмотр)';
    default:         return role;
  }
}

/** Пояснение к роли для админ-панели. */
export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case 'admin':    return 'Управляет пользователями: без филиала — всеми, администратор филиала — только своего филиала';
    case 'director': return 'Работа с данными своего филиала, управление пользователями филиала';
    case 'engineer': return 'Работа с листками и дефектами своего филиала';
    case 'master':   return 'Работа с листками и дефектами, заключения мастера';
    case 'viewer':   return 'Работа с листками и дефектами своего филиала';
    case 'observer': return 'РУП «Гомельэнерго»: просматривает листки и дефекты любого филиала, ничего не изменяет';
    default:         return '';
  }
}

/** Роли, которые может назначать администратор филиала. */
export const FILIAL_ASSIGNABLE_ROLES: ReadonlyArray<UserRole> = ['admin', 'director', 'engineer', 'master', 'viewer'];

/** Роли, которые может назначать главный администратор. */
export const GLOBAL_ASSIGNABLE_ROLES: ReadonlyArray<UserRole> = ['admin', 'director', 'engineer', 'master', 'viewer', 'observer'];

/** Роли, которые могут быть без филиала (главный администратор, наблюдатель РУП). */
export const ROLES_WITHOUT_FILIAL: ReadonlySet<UserRole> = new Set<UserRole>(['admin', 'observer']);
