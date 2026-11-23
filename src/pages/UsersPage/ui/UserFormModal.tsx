import { memo } from 'react';
import type { UserProfile, UserRole } from '@/entities/User';
import { getRoleDescription } from '@/entities/User';
import { PASSWORD_RULES_HINT } from '@/features/ChangePassword';
import { Button, FormField, Input, Modal, Select, VStack } from '@/shared/ui';
import { useUserForm } from '../model/useUserForm';
import cls from './UsersPage.module.scss';

interface UserFormModalProps {
  isOpen: boolean;
  /** null — создание нового пользователя */
  user: UserProfile | null;
  onClose: () => void;
}

export const UserFormModal = memo(({ isOpen, user, onClose }: UserFormModalProps) => {
  const {
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
  } = useUserForm({ isOpen, user, onClose });

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
              <Button variant='secondary' size='s' onClick={handleGeneratePassword}>
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
