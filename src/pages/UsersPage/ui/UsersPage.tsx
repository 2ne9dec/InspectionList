import { memo, useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import type { UserProfile } from '@/entities/User';
import {
  getRoleLabel, getUserAuthData, getUserCanManageUsers, getUserIsGlobalManager, getUserRole,
  useDeleteUserMutation, useGetUsersQuery,
} from '@/entities/User';
import { useGetFilialsQuery } from '@/entities/InspectionLine';
import { getRouteSheets } from '@/shared/const/router';
import { Badge, Button, ConfirmModal, Input, KebabMenu, Loader, Select, useConfirm } from '@/shared/ui';
import { toast } from '@/shared/lib/toast';
import { UserFormModal } from './UserFormModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { RolePermissions } from './RolePermissions';
import cls from './UsersPage.module.scss';

/**
 * Админ-панель: пользователи.
 * Главный администратор видит и настраивает пользователей всех филиалов
 * (в том числе наблюдателей РУП), администратор филиала — только своего филиала.
 * Права проверяются на сервере; здесь только интерфейс.
 */
const UsersPage = () => {
  const me          = useSelector(getUserAuthData);
  const canManage   = useSelector(getUserCanManageUsers);
  const isGlobal    = useSelector(getUserIsGlobalManager);
  // Права ролей настраивает только администратор системы
  const isSystemAdmin = useSelector(getUserRole) === 'admin' && isGlobal;
  const [tab, setTab] = useState<'users' | 'roles'>('users');
  const { data: users = [], isLoading } = useGetUsersQuery(undefined, { skip: !canManage });
  const { data: filials = [] } = useGetFilialsQuery();
  const [deleteUser] = useDeleteUserMutation();
  const { confirm, confirmProps } = useConfirm();

  const [search,       setSearch]       = useState('');
  const [filialFilter, setFilialFilter] = useState<number | ''>('');
  const [formOpen,     setFormOpen]     = useState(false);
  const [editUser,     setEditUser]     = useState<UserProfile | null>(null);
  const [resetUser,    setResetUser]    = useState<UserProfile | null>(null);

  const filialName = useMemo(() => new Map(filials.map((f) => [f.id, f.name])), [filials]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => filialFilter === '' || (filialFilter === 0 ? u.filialId == null : u.filialId === filialFilter))
      .filter((u) => !q || u.username.toLowerCase().includes(q) || (u.displayName ?? '').toLowerCase().includes(q))
      .sort((a, b) => (a.filialId ?? 0) - (b.filialId ?? 0) || a.username.localeCompare(b.username));
  }, [users, search, filialFilter]);

  const handleCreate = useCallback(() => { setEditUser(null); setFormOpen(true); }, []);
  const handleEdit   = useCallback((u: UserProfile) => { setEditUser(u); setFormOpen(true); }, []);
  const handleClose  = useCallback(() => { setFormOpen(false); setEditUser(null); }, []);

  const handleDelete = useCallback(async (u: UserProfile) => {
    const ok = await confirm({
      title: `Удалить пользователя «${u.username}»?`,
      description: 'Учётная запись будет удалена. Листки и дефекты, которые он вносил, сохранятся.',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteUser({ id: u.id, userFilialId: u.filialId }).unwrap();
      toast.success('Пользователь удалён');
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error;
      toast.error(msg ?? 'Не удалось удалить пользователя');
    }
  }, [confirm, deleteUser]);

  if (!canManage) return <Navigate to={getRouteSheets()} replace />;

  return (
    <div className={cls.page}>
      <div className={cls.header}>
        {isSystemAdmin ? (
          <div className={cls.tabs}>
            <Button variant={tab === 'users' ? 'primary' : 'secondary'} size='s' onClick={() => setTab('users')}>
              Пользователи ({users.length})
            </Button>
            <Button variant={tab === 'roles' ? 'primary' : 'secondary'} size='s' onClick={() => setTab('roles')}>
              Роли и права
            </Button>
          </div>
        ) : (
          <>
            <span className={cls.title}>Пользователи</span>
            <span className={cls.count}>{rows.length}</span>
          </>
        )}
        <div className={cls.spacer} />
        {tab === 'users' && (
          <Button variant='primary' size='s' onClick={handleCreate}>+ Добавить пользователя</Button>
        )}
      </div>

      {tab === 'roles' ? <RolePermissions /> : (
      <>

      <div className={cls.filters}>
        <div className={cls.search}>
          <Input
            size='s'
            type='search'
            name='users-search'
            autoComplete='off'
            value={search}
            onChange={setSearch}
            placeholder='Поиск по логину или ФИО…'
          />
        </div>
        {isGlobal && (
          <div className={cls.filialSelect}>
            <Select<number>
              size='s'
              options={[...filials.map((f) => ({ value: f.id, label: f.name })), { value: 0, label: 'Без филиала (РУП, администратор)' }]}
              value={filialFilter}
              placeholder='Все филиалы'
              onChange={(v) => setFilialFilter(v)}
            />
          </div>
        )}
      </div>

      <div className={cls.tableWrap}>
        {isLoading ? (
          <div className={cls.center}><Loader /></div>
        ) : (
          <table className={cls.table}>
            <thead>
              <tr>
                <th>Логин</th>
                <th>ФИО</th>
                <th>Роль</th>
                <th>Филиал</th>
                <th>Пароль</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className={cls.empty}>Пользователи не найдены</td></tr>
              ) : rows.map((u) => {
                const isMe = String(u.id) === String(me?.id) && u.filialId === me?.filialId;
                return (
                  // ID уникален только в пределах базы филиала: ключ — филиал + ID
                  <tr key={`${u.filialId ?? 'rup'}:${u.id}`}>
                    <td className={cls.mono}>{u.username}{isMe && <span className={cls.me}> (вы)</span>}</td>
                    <td>{u.displayName}</td>
                    <td>
                      <Badge variant={u.role === 'observer' ? 'info' : u.role === 'admin' ? 'warning' : 'neutral'}>
                        {getRoleLabel(u.role, u.filialId)}
                      </Badge>
                    </td>
                    <td>{u.filialId == null ? (u.role === 'observer' ? 'РУП «Гомельэнерго»' : '—') : (filialName.get(u.filialId) ?? '—')}</td>
                    <td>
                      {u.mustChangePassword
                        ? <Badge variant='warning'>временный</Badge>
                        : <span className={cls.muted}>задан</span>}
                    </td>
                    <td className={cls.actions}>
                      <KebabMenu
                        ariaLabel='Действия с пользователем'
                        items={[
                          { id: 'edit',  label: 'Изменить', onClick: () => handleEdit(u) },
                          { id: 'reset', label: 'Задать временный пароль', onClick: () => setResetUser(u) },
                          ...(!isMe ? [{ id: 'delete', label: 'Удалить', danger: true, onClick: () => { void handleDelete(u); } }] : []),
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      </>
      )}

      <UserFormModal isOpen={formOpen} user={editUser} onClose={handleClose} />
      <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />
      <ConfirmModal {...confirmProps} />
    </div>
  );
};

export default memo(UsersPage);
