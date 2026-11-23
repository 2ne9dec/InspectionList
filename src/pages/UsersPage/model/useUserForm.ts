import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { UserProfile, UserRole } from '@/entities/User';
import {
  getRoleLabel, getUserFilialId, getUserIsGlobalManager, getUserRole,
  DIRECTOR_ASSIGNABLE, FILIAL_ASSIGNABLE_ROLES, GLOBAL_ASSIGNABLE_ROLES, ROLES_WITHOUT_FILIAL,
  useAdminUpdateUserMutation, useCreateUserMutation,
} from '@/entities/User';
import { useGetFilialsQuery } from '@/entities/InspectionLine';
import { validateNewPassword } from '@/features/ChangePassword';
import { toast } from '@/shared/lib/toast';
import { generateTempPassword } from '../lib/generatePassword';

interface UseUserFormParams {
  isOpen: boolean;
  /** null — создание нового пользователя */
  user: UserProfile | null;
  onClose: () => void;
}

/** Состояние, права и сохранение формы пользователя админ-панели. */
export function useUserForm({ isOpen, user, onClose }: UseUserFormParams) {
  const isGlobal = useSelector(getUserIsGlobalManager);
  const myFilialId = useSelector(getUserFilialId);
  const myRole = useSelector(getUserRole);
  const { data: filials = [] } = useGetFilialsQuery();
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useAdminUpdateUserMutation();

  const isEdit = user != null;

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<UserRole>('electrician');
  const [filialId, setFilialId] = useState<number | ''>('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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

  const handleGeneratePassword = useCallback(() => setPassword(generateTempPassword()), []);

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

  return {
    isEdit,
    username,
    setUsername,
    displayName,
    setDisplayName,
    role,
    setRole,
    filialId,
    setFilialId,
    password,
    setPassword,
    error,
    roleOptions,
    filialOptions,
    showFilial,
    creating,
    updating,
    handleGeneratePassword,
    handleSave,
  };
}
