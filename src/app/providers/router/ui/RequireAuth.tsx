import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { getUserAuthData } from '@/entities/User';
import { getRouteSheets } from '@/shared/const/router';

interface RequireAuthProps {
  children: JSX.Element;
  adminOnly?: boolean;
}

export function RequireAuth({ children, adminOnly }: RequireAuthProps) {
  const auth     = useSelector(getUserAuthData);
  const location = useLocation();

  if (!auth) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && auth.role !== 'admin') {
    return <Navigate to={getRouteSheets()} replace />;
  }

  return children;
}
