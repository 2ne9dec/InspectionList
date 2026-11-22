import { memo, useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import type { UserProfile } from '@/entities/User';
import {
  DIRECTOR_ASSIGNABLE, ROLE_ORDER, getUserAuthData, getUserCanManageUsers, getUserIsGlobalManager, getUserRole,
  useDeleteUserMutation, useGetUsersQuery,
} from '@/entities/User';
import { useGetFilialsQuery } from '@/entities/InspectionLine';
import { getRouteSheets } from '@/shared/const/router';
import { Button, ConfirmModal, Input, Select, useConfirm } from '@/shared/ui';
import { toast } from '@/shared/lib/toast';
import { UserFormModal } from './UserFormModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { RolePermissions } from './RolePermissions';
import { UsersTable } from './UsersTable';
import cls from './UsersPage.module.scss';

/**
 * Админ-панель: пользователи.
 * Главный администратор видит и настраивает пользователей всех филиалов
 * (в том числе наблюдателей РУП), администратор филиала — только своего филиала.
 * Права проверяются на сервере; здесь только интерфейс.
 */
/** 0 — главный администратор, 1 — наблюдатели РУП, 2 — пользователи филиалов. */
const rank = (u: UserProfile) => (u.filialId == null ? (u.role === 'admin' ? 0 : 1) : 2);

const UsersPage = () => {
  const me          = useSelector(getUserAuthData);
  const canManage   = useSelector(getUserCanManageUsers);
  const isGlobal    = useSelector(getUserIsGlobalManager);
  // Права ролей настраивает только администратор системы
  const myRole      = useSelector(getUserRole);
  const isSystemAdmin = myRole === 'admin' && isGlobal;
  // Руководитель: только создаёт инженеров/мастеров/пользователей и задаёт им временный пароль
  const directorRoles = myRole ? DIRECTOR_ASSIGNABLE[myRole] : undefined;
  const isDirector  = directorRoles != null;
  const [tab, setTab] = useState<'users' | 'roles'>('users');
  // Список обновляется сам каждые 10 секунд: новые пользователи появляются без перезагрузки страницы
  const { data: users = [], isLoading } = useGetUsersQuery(undefined, { skip: !canManage, pollingInterval: 10_000 });
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
      // Сверху главный администратор, затем пользователи РУП, затем по филиалам и ролям
      .sort((a, b) => rank(a) - rank(b)
        || (a.filialId ?? 0) - (b.filialId ?? 0)
        || ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
        || a.username.localeCompare(b.username));
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

      <UsersTable
        rows={rows}
        isLoading={isLoading}
        me={me}
        isDirector={isDirector}
        directorRoles={directorRoles}
        filialName={filialName}
        onEdit={handleEdit}
        onReset={setResetUser}
        onDelete={(u) => { void handleDelete(u); }}
      />

      </>
      )}

      <UserFormModal isOpen={formOpen} user={editUser} onClose={handleClose} />
      <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />
      <ConfirmModal {...confirmProps} />
    </div>
  );
};

export default memo(UsersPage);
