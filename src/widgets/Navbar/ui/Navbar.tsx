import { memo, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getRouteSheets, getRouteLogin, getRouteJournal, getRouteAdmin } from '@/shared/const/router';
import {
  getUserAuthData, getUserDisplayName, getUserCanManageUsers, userActions,
} from '@/entities/User';
import { ChangePasswordModal } from '@/features/ChangePassword';
import { FilialSwitcher } from '@/features/FilialSwitcher';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';
import { useAppDispatch } from '@/shared/lib/hooks';
import { ThemeSwitcher } from '@/features/ThemeSwitcher';
import { SyncButton } from '@/features/SyncToServer';
import { Button, HStack } from '@/shared/ui';
import { IconSheet, IconLogout, IconClipboard, IconUser } from '@/shared/ui/Icons';
import cls from './Navbar.module.scss';

interface NavbarProps {
  centerSlot?: React.ReactNode;
}

export const Navbar = memo(({ centerSlot }: NavbarProps) => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const dispatch    = useAppDispatch();
  const displayName = useSelector(getUserDisplayName);
  const auth        = useSelector(getUserAuthData);
  const canManage   = useSelector(getUserCanManageUsers);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const isSheets  = location.pathname === getRouteSheets();
  const isJournal = location.pathname === getRouteJournal();
  const isAdmin   = location.pathname === getRouteAdmin();

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    dispatch(userActions.logout());
    navigate(getRouteLogin());
  }, [dispatch, navigate]);

  return (
    <nav className={cls.navbar} aria-label="Главная навигация">
      <div className={cls.navInner}>

        <HStack gap="2" align="center" className={cls.left}>
          {auth && (
            <Button
              variant={isSheets ? 'primary' : 'secondary'}
              size="s"
              onClick={() => navigate(getRouteSheets())}
              leftIcon={<IconSheet size={14} />}
            >
              Листки
            </Button>
          )}
          {auth && (
            <Button
              variant={isJournal ? 'primary' : 'secondary'}
              size="s"
              onClick={() => navigate(getRouteJournal())}
              leftIcon={<IconClipboard size={14} />}
            >
              Журнал
            </Button>
          )}
          {auth && canManage && (
            <Button
              variant={isAdmin ? 'primary' : 'secondary'}
              size="s"
              onClick={() => navigate(getRouteAdmin())}
              leftIcon={<IconUser size={14} />}
            >
              Пользователи
            </Button>
          )}
          {auth && <FilialSwitcher />}
        </HStack>

        {centerSlot && (
          <HStack gap="2" className={cls.center}>{centerSlot}</HStack>
        )}

        <HStack gap="2" align="center" className={cls.right}>
          {auth && (
            <button
              type="button"
              className={cls.userName}
              onClick={() => setPasswordOpen(true)}
              title="Сменить пароль"
            >
              {displayName}
            </button>
          )}
          {auth && <SyncButton />}
          {auth && <ThemeSwitcher />}
          {auth && (
            <Button
              variant="secondary"
              size="s"
              leftIcon={<IconLogout size={14} />}
              onClick={handleLogout}
            >
              Выход
            </Button>
          )}
        </HStack>

      </div>
      <ChangePasswordModal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </nav>
  );
});

Navbar.displayName = 'Navbar';
