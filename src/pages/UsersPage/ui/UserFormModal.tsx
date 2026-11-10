import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { UserProfile, UserRole } from '@/entities/User';
import {
  getRoleDescription, getRoleLabel, getUserIsGlobalManager, getUserFilialId, getUserRole,
  DIRECTOR_ASSIGNABLE, FILIAL_ASSIGNABLE_ROLES, GLOBAL_ASSIGNABLE_ROLES, ROLES_WITHOUT_FILIAL,
  useAdminUpdateUserMutation, useCreateUserMutation,
} from '@/entities/User';
import { useGetFilialsQuery } from '@/entities/InspectionLine';
import { validateNewPassword, PASSWORD_RULES_HINT } from '@/features/ChangePassword';
import { Button, FormField, Input, Modal, Select, VStack } from '@/shared/ui';
import { toast } from '@/shared/lib/toast';
import { generateTempPassword } from '../lib/generatePassword';
import cls from './UsersPage.module.scss';

interface UserFormModalProps {
  isOpen: boolean;
  /** null — создание нового пользователя */
  user: UserProfile | null;
  onClose: () => void;
}

export const UserFormModal = memo(({ isOpen, user, onClose }: UserFormModalProps) => {
  const isGlobal     = useSelector(getUserIsGlobalManager);
  const myFilialId   = useSelector(getUserFilialId);
  const myRole       = useSelector(getUserRole);
  const { data: filials = [] } = useGetFilialsQuery();
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useAdminUpdateUserMutation();

  const isEdit = user != null;

  const [username,    setUsername]    = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role,        setRole]        = useState<UserRole>('electrician');
  const [filialId,    setFilialId]    = useState<number | ''>('');
  const [password,    setPassword]    = useState('');
  const [error,       setError]       = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setUsername(user?.username ?? '');
    setDisplayName(user?.displayName ?? '');
    setRole(user?.role ?? 'electrician');
    setFilialId(user ? (user.filialId ?? '') : (myFilialId ?? ''));
    setPassword(user ? '' : generateTempPassword());
  }, [isOpen, user, myFilialId]);

  const roleOptions = useMemo(() => {
    // Руководитель создаёт только сотрудников своей службы
    let roles = (myRole && DIRECTOR_ASSIGNABLE[myRole])
      ?? (isGlobal ? GLOBAL_ASSIGNABLE_ROLES : FILIAL_ASSIGNABLE_ROLES);
    // При редактировании филиал не меняется: пользователю без филиала — роли без филиала, пользователю филиала — роли филиала
    if (isEdit && user) {
      roles = user.filialId == null
        ? roles.filter((r) => ROLES_WITHOUT_FILIAL.has(r))
        : roles.filter((r) => !ROLES_WITHOUT_FILIAL.has(r));
      // Прежняя роль, которой больше нет в списке (например, администратор филиала)
      if (!roles.includes(user.role)) roles = [user.role, ...roles];
    }
    return roles.map((r) => ({ value: r, label: getRoleLabel(r, isEdit && user ? user.filialId : null) }));
  }, [isGlobal, isEdit, user, myRole]);

  // Новый пользователь: роль по умолчанию — первая доступная
  useEffect(() => {
    if (!isOpen || isEdit || roleOptions.length === 0) return;
    if (!roleOptions.some((o) => o.value === role)) setRole(roleOptions[0].value);
  }, [isOpen, isEdit, role, roleOptions]);

  const filialOptions = useMemo(
    () => filials.map((f) => ({ value: f.id, label: f.name })),
    [filials],
  );

  // Филиал задаётся при создании: пользователь хранится в базе своего филиала
  // Главный администратор и наблюдатель РУП — без филиала
  const withoutFilial = !isEdit && ROLES_WITHOUT_FILIAL.has(role);
  const showFilial = isGlobal && (isEdit ? user?.filialId != null : !withoutFilial);

  const handleSave = useCallback(async () => {
    setError('');
    const effFilial = withoutFilial ? null : (filialId === '' ? null : Number(filialId));
    if (!username.trim()) { setError('Укажите логин'); return; }
    if (!displayName.trim()) { setError('Укажите ФИО'); return; }
    if (effFilial == null && !ROLES_WITHOUT_FILIAL.has(role)) { setError('Укажите филиал'); return; }
    if (!isEdit) {
      const passErr = validateNewPassword(password);
      if (passErr) { setError(passErr); return; }
    }

    try {
      if (isEdit && user) {
        await updateUser({
          id: user.id,
          userFilialId: user.filialId,
          username: username.trim(),
          displayName: displayName.trim(),
          role,
        }).unwrap();
        toast.success('Пользователь сохранён');
      } else {
        await createUser({
          username: username.trim().toLowerCase(),
          password,
          displayName: displayName.trim(),
          role,
          filialId: isGlobal ? effFilial : myFilialId,
        }).unwrap();
        toast.success(`Пользователь создан. Временный пароль: ${password}`);
      }
      onClose();
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error;
      setError(msg ?? 'Не удалось сохранить пользователя');
    }
  }, [createUser, displayName, filialId, isEdit, isGlobal, myFilialId, onClose, password, role, updateUser, user, username, withoutFilial]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Изменить пользователя' : 'Новый пользователь'}
      footer={
        <>
          <Button variant='ghost' size='s' onClick={onClose}>Отмена</Button>
          <Button variant='primary' size='s' loading={creating || updating} onClick={handleSave}>
            {isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </>
      }
    >
      <VStack gap='3'>
        {error && <div className={cls.formError} role='alert'>{error}</div>}
        <FormField label='Логин' htmlFor='uf-username' required>
          <Input id='uf-username' value={username} onChange={setUsername} autoComplete='off' />
        </FormField>
        <FormField label='ФИО (отображаемое имя)' htmlFor='uf-name' required>
          <Input id='uf-name' value={displayName} onChange={setDisplayName} placeholder='Фамилия И.О.' />
        </FormField>
        <FormField label='Роль' htmlFor='uf-role' hint={getRoleDescription(role)}>
          <Select<UserRole>
            id='uf-role'
            options={roleOptions}
            value={role}
            onChange={(v) => v !== '' && setRole(v)}
          />
        </FormField>
        {showFilial && (
          <FormField
            label='Филиал'
            htmlFor='uf-filial'
            hint={isEdit ? 'Филиал после создания не меняется' : undefined}
          >
            <Select<number>
              id='uf-filial'
              disabled={isEdit}
              options={filialOptions}
              value={filialId}
              placeholder='— выберите филиал —'
              onChange={(v) => setFilialId(v)}
            />
          </FormField>
        )}
        {!isEdit && (
          <FormField
            label='Временный пароль'
            htmlFor='uf-pass'
            hint={`${PASSWORD_RULES_HINT}. Пользователь сменит его при первом входе.`}
          >
            <div className={cls.passRow}>
              <Input id='uf-pass' value={password} onChange={setPassword} autoComplete='off' />
              <Button variant='secondary' size='s' onClick={() => setPassword(generateTempPassword())}>
                Сгенерировать
              </Button>
            </div>
          </FormField>
        )}
      </VStack>
    </Modal>
  );
});

UserFormModal.displayName = 'UserFormModal';
