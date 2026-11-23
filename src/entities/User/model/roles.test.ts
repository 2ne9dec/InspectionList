import {
  DIRECTOR_ASSIGNABLE,
  FILIAL_ASSIGNABLE_ROLES,
  GLOBAL_ASSIGNABLE_ROLES,
  MANAGER_ROLES,
  READ_ONLY_ROLES,
  ROLE_ORDER,
  ROLES_WITHOUT_FILIAL,
  getRoleDescription,
  getRoleLabel,
} from './roles';
import type { UserRole } from './types';

describe('getRoleLabel', () => {
  it.each<[UserRole, string]>([
    ['director_sbpl', 'Руководитель СБПЛСиОИ'],
    ['engineer_sbpl', 'Инженер СБПЛСиОИ'],
    ['director', 'Руководитель СЛ'],
    ['engineer', 'Инженер СЛ'],
    ['master', 'Мастер СЛ'],
    ['electrician', 'Электромонтёр СЛ'],
    ['observer', 'Наблюдатель РУП «Гомельэнерго»'],
  ])('возвращает название роли %s', (role, expected) => {
    expect(getRoleLabel(role, 1)).toBe(expected);
  });

  it('различает главного администратора и администратора филиала', () => {
    expect(getRoleLabel('admin', null)).toBe('Главный администратор');
    expect(getRoleLabel('admin', 2)).toBe('Администратор филиала');
  });

  it('возвращает исходную роль, если название не задано', () => {
    expect(getRoleLabel('unknown' as UserRole, 1)).toBe('unknown');
  });
});

describe('getRoleDescription', () => {
  it('описывает все известные роли', () => {
    for (const role of ROLE_ORDER) {
      expect(getRoleDescription(role).length).toBeGreaterThan(0);
    }
  });

  it('уточняет права администратора филиала в описании', () => {
    expect(getRoleDescription('admin')).toContain('всех филиалов');
  });

  it('возвращает пустую строку для неизвестной роли', () => {
    expect(getRoleDescription('unknown' as UserRole)).toBe('');
  });
});

describe('role sets and lists', () => {
  it('READ_ONLY_ROLES содержит только наблюдателя', () => {
    expect([...READ_ONLY_ROLES]).toEqual(['observer']);
    expect(READ_ONLY_ROLES.has('engineer')).toBe(false);
  });

  it('MANAGER_ROLES содержит администратора и обоих руководителей', () => {
    expect([...MANAGER_ROLES]).toEqual(['admin', 'director_sbpl', 'director']);
    expect(MANAGER_ROLES.has('engineer')).toBe(false);
  });

  it('ROLE_ORDER задаёт порядок от администратора к наблюдателю', () => {
    expect(ROLE_ORDER).toEqual([
      'admin', 'director_sbpl', 'engineer_sbpl', 'director',
      'engineer', 'master', 'electrician', 'observer',
    ]);
  });

  it('FILIAL_ASSIGNABLE_ROLES не содержит администратора и наблюдателя', () => {
    expect(FILIAL_ASSIGNABLE_ROLES).not.toContain('admin');
    expect(FILIAL_ASSIGNABLE_ROLES).not.toContain('observer');
    expect(FILIAL_ASSIGNABLE_ROLES).toContain('director_sbpl');
    expect(FILIAL_ASSIGNABLE_ROLES).toContain('engineer_sbpl');
    expect(FILIAL_ASSIGNABLE_ROLES).toContain('electrician');
  });

  it('DIRECTOR_ASSIGNABLE ограничивает руководителей своей службой', () => {
    expect(DIRECTOR_ASSIGNABLE.director_sbpl).toEqual(['engineer_sbpl']);
    expect(DIRECTOR_ASSIGNABLE.director).toEqual(['engineer', 'master', 'electrician']);
    expect(DIRECTOR_ASSIGNABLE.admin).toBeUndefined();
  });

  it('главный администратор может назначить любую роль', () => {
    expect(GLOBAL_ASSIGNABLE_ROLES).toEqual(ROLE_ORDER);
  });

  it('ROLES_WITHOUT_FILIAL — только admin и observer', () => {
    expect([...ROLES_WITHOUT_FILIAL]).toEqual(['admin', 'observer']);
    expect(ROLES_WITHOUT_FILIAL.has('director')).toBe(false);
  });
});
