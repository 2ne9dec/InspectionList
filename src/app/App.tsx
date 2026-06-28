import { Suspense, memo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { Navbar } from '@/widgets/Navbar';
import { SheetsListNavbarSlot } from '@/pages/SheetsListPage';
import { getRouteSheets } from '@/shared/const/router';
import { getUserAuthData, getUserInited, userActions } from '@/entities/User';
import { useAppDispatch, useTheme } from '@/shared/lib/hooks';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Toaster } from '@/shared/ui/Toaster';
import { useSyncService } from '@/shared/lib/sync/useSyncService';
import { AppRouter } from './providers/router';

const NavbarWithSlot = memo(() => {
  const location = useLocation();
  const auth = useSelector(getUserAuthData);
  const isMain = location.pathname === getRouteSheets();

  if (!auth) return null;

  return <Navbar centerSlot={isMain ? <SheetsListNavbarSlot /> : undefined} />;
});
NavbarWithSlot.displayName = 'NavbarWithSlot';

const App = () => {
  const dispatch = useAppDispatch();
  const inited   = useSelector(getUserInited);
  const auth     = useSelector(getUserAuthData);

  useTheme();
  useSyncService();

  useEffect(() => {
    dispatch(userActions.initAuthData());
  }, [dispatch]);

  if (!inited) return null;

  const withNavbar = Boolean(auth);

  return (
    <div className='app'>
      <Suspense fallback=''>
        <NavbarWithSlot />
        <div className={classNames('content-page', { 'content-page--with-navbar': withNavbar })}>
          <AppRouter />
        </div>
      </Suspense>
      <Toaster />
    </div>
  );
};

export default App;
