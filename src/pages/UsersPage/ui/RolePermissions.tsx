import { Fragment, memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { Permission, PermissionInfo, UserRole } from '@/entities/User';
import { getRoleLabel, useGetRolePermissionsQuery, useSaveRolePermissionsMutation } from '@/entities/User';
import { Button, Checkbox, Loader, Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '@/shared/ui';
import { toast } from '@/shared/lib/toast';
import cls from './UsersPage.module.scss';

type Matrix = Record<string, Set<Permission>>;

/**
 * «Роли и права»: администратор системы отмечает, что может каждая роль.
 * Администратор может всё (не настраивается). Наблюдателю РУП можно дать только
 * права, не изменяющие данные (выгрузка в Excel). Удаление листков — только
 * администратор системы. Просмотр листков и дефектов доступен всем.
 */
export const RolePermissions = memo(() => {
  const { data, isLoading } = useGetRolePermissionsQuery();
  const [save, { isLoading: saving }] = useSaveRolePermissionsMutation();
  const [matrix, setMatrix] = useState<Matrix>({});

  useEffect(() => {
    if (!data) return;
    const m: Matrix = {};
    for (const [role, keys] of Object.entries(data.roles)) m[role] = new Set(keys);
    setMatrix(m);
  }, [data]);

  const groups = useMemo(() => {
    const map = new Map<string, PermissionInfo[]>();
    for (const p of data?.permissions ?? []) {
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group)!.push(p);
    }
    return [...map.entries()];
  }, [data]);

  const editable = useMemo(() => data?.editableRoles ?? [], [data]);
  const columns: UserRole[] = ['admin', ...editable];
  const observerAllowed = useMemo(() => new Set(data?.observerAllowed ?? []), [data]);

  const changed = useMemo(() => editable.filter((role) => {
    const a = matrix[role];
    const b = new Set(data?.roles[role] ?? []);
    if (!a) return false;
    return a.size !== b.size || [...a].some((k) => !b.has(k));
  }), [data, editable, matrix]);

  const toggle = useCallback((role: string, key: Permission) => {
    setMatrix((prev) => {
      const next = { ...prev, [role]: new Set(prev[role]) };
      if (next[role].has(key)) next[role].delete(key); else next[role].add(key);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    try {
      for (const role of changed) {
        await save({ role, permissions: [...(matrix[role] ?? [])] }).unwrap();
      }
      toast.success('Права ролей сохранены');
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error;
      toast.error(msg ?? 'Не удалось сохранить права');
    }
  }, [changed, matrix, save]);

  if (isLoading || !data) return <div className={cls.center}><Loader /></div>;

  return (
    <div className={cls.rolesWrap}>
      <div className={cls.rolesHint}>
        Отметьте, что может каждая роль. Просмотр листков и дефектов доступен всем.
        Администратор может всё. Наблюдателю РУП можно разрешить только выгрузку в Excel.
        Удаление листков — только главный администратор.
      </div>
      <div className={cls.tableWrap}>
        <Table className={cls.table}>
          <TableHead>
            <TableRow>
              <TableTh>Действие</TableTh>
              {columns.map((r) => (
                <TableTh key={r} className={cls.roleCol}>
                  {getRoleLabel(r, r === 'admin' ? null : 1)}
                </TableTh>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map(([group, perms]) => (
              <Fragment key={group}>
                <TableRow className={cls.groupRow}><TableTd colSpan={columns.length + 1}>{group}</TableTd></TableRow>
                {perms.map((p) => (
                  <TableRow key={p.key}>
                    <TableTd>{p.label}</TableTd>
                    {columns.map((role) => {
                      const observerLocked = role === 'observer' && !observerAllowed.has(p.key);
                      const fixed = role === 'admin' || observerLocked;
                      const checked = role === 'admin' ? true : observerLocked ? false : !!matrix[role]?.has(p.key);
                      return (
                        <TableTd key={role} className={cls.roleCol}>
                          <Checkbox
                            checked={checked}
                            disabled={fixed}
                            onChange={() => toggle(role, p.key)}
                            aria-label={`${p.label}: ${role}`}
                          />
                        </TableTd>
                      );
                    })}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className={cls.rolesActions}>
        <Button variant='primary' size='s' disabled={changed.length === 0} loading={saving}
onClick={handleSave}>
          Сохранить
        </Button>
      </div>
    </div>
  );
});

RolePermissions.displayName = 'RolePermissions';
