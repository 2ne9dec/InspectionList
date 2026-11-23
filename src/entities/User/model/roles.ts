import type { UserRole } from './types';

/** Роли «только просмотр». Запрет изменений проверяется и на сервере. */
export const READ_ONLY_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['observer']);

/** Роли, которым доступна админ-панель пользователей. */
export const MANAGER_ROLES: ReadonlySet<UserRole> = new Set<UserRole>(['admin', 'director_sbpl', 'director']);

/** Название роли для интерфейса. */
export function getRoleLabel(role: UserRole, filialId: number | null): string {
  switch (role) {
    case 'admin':         return filialId == null ? 'Главный администратор' : 'Администратор филиала';
    case 'director_sbpl': return 'Руководитель СБПЛСиОИ';
    case 'engineer_sbpl': return 'Инженер СБПЛСиОИ';
    case 'director':      return 'Руководитель СЛ';
    case 'engineer':      return 'Инженер СЛ';
    case 'master':        return 'Мастер СЛ';
    case 'electrician':   return 'Электромонтёр СЛ';
    case 'observer':      return 'Наблюдатель РУП «Гомельэнерго»';
    default:              return role;
  }
}

/** Пояснение к роли для админ-панели. */
export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case 'admin':         return 'Управляет пользователями всех филиалов и правами ролей, удаляет листки';
    case 'director_sbpl': return 'Работа с данными своего филиала; создаёт инженеров СБПЛСиОИ и задаёт им временный пароль';
    case 'engineer_sbpl': return 'Работа с листками и дефектами своего филиала';
    case 'director':      return 'Работа с данными своего филиала; создаёт инженеров, мастеров и электромонтёров СЛ и задаёт им временный пароль';
    case 'engineer':      return 'Работа с листками и дефектами своего филиала';
    case 'master':        return 'Работа с листками и дефектами, заключения мастера';
    case 'electrician':   return 'Работа с листками и дефектами своего филиала';
    case 'observer':      return 'Просматривает листки и дефекты любого филиала, ничего не изменяет (выгрузку в Excel можно разрешить в «Роли и права»)';
    default:              return '';
  }
}

/** Порядок ролей в списках (админ-панель, «Роли и права»). */
export const ROLE_ORDER: ReadonlyArray<UserRole> = [
  'admin', 'director_sbpl', 'engineer_sbpl', 'director', 'engineer', 'master', 'electrician', 'observer',
];

/** Роли пользователей филиала. */
export const FILIAL_ASSIGNABLE_ROLES: ReadonlyArray<UserRole> = [
  'director_sbpl', 'engineer_sbpl', 'director', 'engineer', 'master', 'electrician',
];

/** Кого может создавать руководитель: только сотрудников своей службы. */
export const DIRECTOR_ASSIGNABLE: Partial<Record<UserRole, ReadonlyArray<UserRole>>> = {
  director_sbpl: ['engineer_sbpl'],
  director:      ['engineer', 'master', 'electrician'],
};

/** Роли, которые может назначать главный администратор. */
export const GLOBAL_ASSIGNABLE_ROLES: ReadonlyArray<UserRole> = ROLE_ORDER;

/** Роли, которые могут быть без филиала (главный администратор, наблюдатель РУП). */
export const ROLES_WITHOUT_FILIAL: ReadonlySet<UserRole> = new Set<UserRole>(['admin', 'observer']);
