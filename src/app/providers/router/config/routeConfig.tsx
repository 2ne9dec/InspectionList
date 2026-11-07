import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import {
  AppRoutes,
  getRouteSheets,
  getRouteSheetDetail,
  getRouteJournal,
  getRouteAdmin,
} from '@/shared/const/router';
import type { AppRoutesProps } from '@/shared/types/router';

const LoginPage       = lazy(() => import('@/pages/LoginPage'));
const SheetsListPage  = lazy(() => import('@/pages/SheetsListPage'));
const SheetDetailPage = lazy(() => import('@/pages/SheetDetailPage'));
const JournalPage     = lazy(() => import('@/pages/JournalPage'));
const NotFoundPage    = lazy(() => import('@/pages/NotFoundPage'));
const UsersPage       = lazy(() => import('@/pages/UsersPage'));

export const routeConfig: Record<AppRoutes, AppRoutesProps> = {
  [AppRoutes.ROOT]:         { path: '/',                         element: <Navigate to={getRouteSheets()} replace />, authOnly: false },
  [AppRoutes.LOGIN]:        { path: '/login',                    element: <LoginPage />,       authOnly: false },
  [AppRoutes.SHEETS]:       { path: getRouteSheets(),            element: <SheetsListPage />,  authOnly: true  },
  [AppRoutes.MAIN]:         { path: '/sheets',                   element: <SheetsListPage />,  authOnly: true  },
  [AppRoutes.SHEET_DETAIL]: { path: getRouteSheetDetail(':id'),  element: <SheetDetailPage />, authOnly: true  },
  [AppRoutes.JOURNAL]:      { path: getRouteJournal(),           element: <JournalPage />,     authOnly: true  },
  [AppRoutes.ADMIN]:        { path: getRouteAdmin(),             element: <UsersPage />,       authOnly: true  },
  [AppRoutes.NOT_FOUND]:    { path: '*',                         element: <NotFoundPage />,    authOnly: false },
};
