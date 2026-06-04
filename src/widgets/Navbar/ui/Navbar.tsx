import { memo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getRouteSheets, getRouteLogin } from '@/shared/const/router';
import { getUserAuthData, getUserDisplayName, userActions } from '@/entities/User';
import { useAppDispatch } from '@/shared/lib/hooks';
import { ThemeSwitcher } from '@/features/ThemeSwitcher';
import { SyncButton } from '@/features/SyncToServer';
import { Button, HStack } from '@/shared/ui';
import { IconSheet, IconLogout } from '@/shared/ui/Icons';
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

  const isSheets = location.pathname === getRouteSheets();

  const handleLogout = useCallback(() => {
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
        </HStack>

        {centerSlot && (
          <HStack gap="2" className={cls.center}>{centerSlot}</HStack>
        )}

        <HStack gap="2" align="center" className={cls.right}>
          {auth && <span className={cls.userName}>{displayName}</span>}
          {auth && <SyncButton />}
          <ThemeSwitcher />
          {auth && (
            <Button
              variant="secondary"
              size="s"
              onClick={handleLogout}
              leftIcon={<IconLogout size={14} />}
            >
              Выйти
            </Button>
          )}
        </HStack>
      </div>
    </nav>
  );
});

Navbar.displayName = 'Navbar';
