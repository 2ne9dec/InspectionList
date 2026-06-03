import { memo, Suspense, useCallback } from 'react';
import { Route, Routes } from 'react-router-dom';
import { PageLoader } from '@/widgets/PageLoader';
import { RequireAuth } from './RequireAuth';
import { routeConfig } from '../config/routeConfig';
import type { AppRoutesProps } from '@/shared/types/router';

const AppRouter = () => {
  const renderRoute = useCallback((route: AppRoutesProps) => {
    const element = <Suspense fallback={<PageLoader />}>{route.element}</Suspense>;

    return (
      <Route
        key={route.path}
        path={route.path}
        element={
          route.authOnly
            ? <RequireAuth adminOnly={route.adminOnly}>{element}</RequireAuth>
            : element
        }
      />
    );
  }, []);

  return <Routes>{Object.values(routeConfig).map(renderRoute)}</Routes>;
};

export default memo(AppRouter);
