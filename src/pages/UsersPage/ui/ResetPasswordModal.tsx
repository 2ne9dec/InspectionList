import { memo, useCallback, useEffect, useState } from 'react';
import type { UserProfile } from '@/entities/User';
import { useResetPasswordMutation } from '@/entities/User';
import { validateNewPassword, PASSWORD_RULES_HINT } from '@/features/ChangePassword';
import { Button, FormField, Input, Modal, VStack } from '@/shared/ui';
import { toast } from '@/shared/lib/toast';
import { generateTempPassword } from '../lib/generatePassword';
import cls from './UsersPage.module.scss';

interface ResetPasswordModalProps {
  user: UserProfile | null;
  onClose: () => void;
}

/** Задать пользователю временный пароль (если забыл). При входе он обязан его сменить. */
export const ResetPasswordModal = memo(({ user, onClose }: ResetPasswordModalProps) => {
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (user) { setPassword(generateTempPassword()); setError(''); }
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    const passErr = validateNewPassword(password);
    if (passErr) { setError(passErr); return; }
    try {
      await resetPassword({ id: user.id, userFilialId: user.filialId, newPass: password }).unwrap();
      toast.success(`Временный пароль для «${user.username}»: ${password}`);
      onClose();
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error;
      setError(msg ?? 'Не удалось задать пароль');
    }
  }, [onClose, password, resetPassword, user]);

  return (
    <Modal
      isOpen={user != null}
      onClose={onClose}
      title={user ? `Временный пароль — ${user.displayName || user.username}` : ''}
      footer={
        <>
          <Button variant='ghost' size='s' onClick={onClose}>Отмена</Button>
          <Button variant='primary' size='s' loading={isLoading} onClick={handleSave}>Задать пароль</Button>
        </>
      }
    >
      <VStack gap='3'>
        <div className={cls.formNote}>
          Сообщите пароль пользователю лично. При входе система попросит его задать свой пароль.
        </div>
        {error && <div className={cls.formError} role='alert'>{error}</div>}
        <FormField label='Временный пароль' htmlFor='rp-pass' hint={PASSWORD_RULES_HINT}>
          <div className={cls.passRow}>
            <Input id='rp-pass' value={password} onChange={setPassword} autoComplete='off' />
            <Button variant='secondary' size='s' onClick={() => setPassword(generateTempPassword())}>
              Сгенерировать
            </Button>
          </div>
        </FormField>
      </VStack>
    </Modal>
  );
});

ResetPasswordModal.displayName = 'ResetPasswordModal';
