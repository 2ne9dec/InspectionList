import { memo, useCallback, useState } from 'react';
import { useAppDispatch } from '@/shared/lib/hooks';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';
import { useChangePasswordMutation, userActions, getUserAuthData } from '@/entities/User';
import { useSelector } from 'react-redux';
import { Button, FormField, PasswordInput, VStack } from '@/shared/ui';
import { toast } from '@/shared/lib/toast';
import { PASSWORD_RULES_HINT, validateNewPassword } from '../model/passwordRules';
import cls from './ChangePasswordForm.module.scss';

interface ChangePasswordFormProps {
  /** Обязательная смена пароля (первый вход / пароль задан администратором). */
  forced?: boolean;
  onDone?: () => void;
  onCancel?: () => void;
  /** Выход из учётной записи (на экране обязательной смены пароля). */
  onLogout?: () => void;
}

/**
 * Смена своего пароля. Сервер возвращает обновлённый профиль и новый токен —
 * сохраняем их, чтобы снять признак обязательной смены пароля без повторного входа.
 */
export const ChangePasswordForm = memo(({ forced, onDone, onCancel, onLogout }: ChangePasswordFormProps) => {
  const dispatch = useAppDispatch();
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const login = useSelector(getUserAuthData)?.username ?? '';

  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [repeat,  setRepeat]  = useState('');
  const [error,   setError]   = useState('');

  const handleSubmit = useCallback(async () => {
    setError('');
    if (!oldPass || !newPass) { setError('Заполните все поля'); return; }
    const ruleErr = validateNewPassword(newPass, oldPass);
    if (ruleErr) { setError(ruleErr); return; }
    if (newPass !== repeat) { setError('Новый пароль и повтор не совпадают'); return; }

    try {
      const res = await changePassword({ oldPass, newPass }).unwrap();
      const { token, ...user } = res;
      if (token) sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
      sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      dispatch(userActions.setAuthData(user));
      toast.success('Пароль изменён');
      setOldPass(''); setNewPass(''); setRepeat('');
      onDone?.();
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error;
      setError(msg ?? 'Не удалось сменить пароль');
    }
  }, [changePassword, dispatch, newPass, oldPass, onDone, repeat]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleSubmit();
  }, [handleSubmit]);

  return (
    <VStack gap='3' className={cls.form}>
      {/* Скрытое поле логина: браузер подставляет логин сюда, а не в поиск на странице */}
      <input type='text' name='username' autoComplete='username' value={login}
readOnly hidden />
      {forced && (
        <div className={cls.notice}>
          При первом входе необходимо сменить пароль.
        </div>
      )}
      {error && <div className={cls.error} role='alert'>{error}</div>}

      <FormField label='Текущий пароль' htmlFor='cp-old'>
        <PasswordInput id='cp-old' className={cls.input} value={oldPass} onChange={setOldPass}
          autoComplete='current-password' onKeyDown={handleKeyDown} autofocus />
      </FormField>
      <FormField label='Новый пароль' htmlFor='cp-new'>
        <PasswordInput id='cp-new' className={cls.input} value={newPass} onChange={setNewPass}
          autoComplete='new-password' onKeyDown={handleKeyDown} hint={PASSWORD_RULES_HINT} />
      </FormField>
      <FormField label='Повторите новый пароль' htmlFor='cp-repeat'>
        <PasswordInput id='cp-repeat' className={cls.input} value={repeat} onChange={setRepeat}
          autoComplete='new-password' onKeyDown={handleKeyDown} />
      </FormField>

      <div className={cls.actions}>
        {onLogout && <Button variant='secondary' size='m' onClick={onLogout}>Выйти</Button>}
        <span className={cls.spacer} />
        {onCancel && <Button variant='ghost' size='m' onClick={onCancel}>Отмена</Button>}
        <Button variant='primary' size='m' loading={isLoading} onClick={handleSubmit}>
          Сменить пароль
        </Button>
      </div>
    </VStack>
  );
});

ChangePasswordForm.displayName = 'ChangePasswordForm';
