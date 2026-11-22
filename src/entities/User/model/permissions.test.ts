import { OFFLINE_DEFAULT_PERMISSIONS } from './permissions';
import type { UserRole } from './types';

describe('OFFLINE_DEFAULT_PERMISSIONS', () => {
  it('руководители получают полный набор прав, но не удаление', () => {
    const expected = [
      'sheets.create', 'sheets.edit', 'sheets.merge',
      'defects.create', 'defects.edit', 'defects.fix',
      'journal.conclusion', 'export.excel',
    ];

    expect(OFFLINE_DEFAULT_PERMISSIONS.director).toEqual(expected);
    expect(OFFLINE_DEFAULT_PERMISSIONS.director_sbpl).toEqual(expected);
    expect(OFFLINE_DEFAULT_PERMISSIONS.director).not.toContain('sheets.delete');
    expect(OFFLINE_DEFAULT_PERMISSIONS.director).not.toContain('defects.delete');
  });

  it.each<[UserRole]>([['engineer'], ['engineer_sbpl'], ['master'], ['electrician']])(
    'исполнитель %s не может менять листки, устранять и удалять дефекты',
    (role) => {
      expect(OFFLINE_DEFAULT_PERMISSIONS[role]).toEqual([
        'sheets.create', 'defects.create', 'defects.edit', 'export.excel',
      ]);
      expect(OFFLINE_DEFAULT_PERMISSIONS[role]).not.toContain('defects.fix');
      expect(OFFLINE_DEFAULT_PERMISSIONS[role]).not.toContain('defects.delete');
    },
  );

  it('наблюдателю по умолчанию разрешена только выгрузка в Excel', () => {
    expect(OFFLINE_DEFAULT_PERMISSIONS.observer).toEqual(['export.excel']);
  });

  it('администратор не ограничен офлайн-правами по умолчанию', () => {
    expect(OFFLINE_DEFAULT_PERMISSIONS.admin).toBeUndefined();
  });
});
