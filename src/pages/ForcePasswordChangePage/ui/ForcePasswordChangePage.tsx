import { memo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ChangePasswordForm } from '@/features/ChangePassword';
import { getUserDisplayName, userActions } from '@/entities/User';
import { useAppDispatch } from '@/shared/lib/hooks';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';
import { getRouteLogin, getRouteSheets } from '@/shared/const/router';
import cls from './ForcePasswordChangePage.module.scss';

/**
 * Экран обязательной смены временного пароля.
 * Показывается вместо приложения, пока пользователь не сменит пароль
 * (новая учётная запись или пароль сброшен администратором).
 */
const ForcePasswordChangePage = () => {
  const dispatch    = useAppDispatch();
  const navigate    = useNavigate();
  const displayName = useSelector(getUserDisplayName);

  const handleDone = useCallback(() => navigate(getRouteSheets(), { replace: true }), [navigate]);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    dispatch(userActions.logout());
    navigate(getRouteLogin(), { replace: true });
  }, [dispatch, navigate]);

  return (
    <div className={cls.page}>
      <div className={cls.card}>
        <div className={cls.header}>
          <span className={cls.title}>Смена пароля</span>
          {displayName && <span className={cls.user}>{displayName}</span>}
        </div>
        <ChangePasswordForm forced onDone={handleDone} onLogout={handleLogout} />
      </div>
    </div>
  );
};

export default memo(ForcePasswordChangePage);
