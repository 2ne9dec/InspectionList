import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useGetMyPermissionsQuery } from '../api/permissionsApi';
import { getUserAuthData } from './selectors';
import { OFFLINE_DEFAULT_PERMISSIONS } from './permissions';
import type { Permission } from './permissions';

/**
 * Права текущего пользователя: can('defects.fix') → true / false.
 * Права задаёт администратор в «Пользователи → Роли и права»; сервер проверяет их сам,
 * здесь — только скрытие недоступных кнопок.
 */
export function usePermissions() {
  const auth = useSelector(getUserAuthData);
  const { data, isError } = useGetMyPermissionsQuery(undefined, { skip: !auth });

  return useMemo(() => {
    let set: Set<Permission>;
    if (!auth) set = new Set();
    else if (auth.role === 'admin') {
      set = new Set<Permission>(['sheets.create', 'sheets.edit', 'sheets.merge', 'defects.create', 'defects.edit', 'defects.fix', 'defects.delete', 'journal.conclusion', 'export.excel']);
      // Удалять листки может только администратор системы (без филиала)
      if (auth.filialId == null) set.add('sheets.delete');
    }
    else if (data) set = new Set(data.permissions);
    else if (isError) set = new Set(OFFLINE_DEFAULT_PERMISSIONS[auth.role] ?? []);
    else set = new Set();
    return { can: (p: Permission) => set.has(p) };
  }, [auth, data, isError]);
}

export function useCan(p: Permission): boolean {
  return usePermissions().can(p);
}
