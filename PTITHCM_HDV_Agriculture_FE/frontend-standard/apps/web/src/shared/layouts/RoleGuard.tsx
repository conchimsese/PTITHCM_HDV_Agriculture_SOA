import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from '@agri/contracts';
import { useSession } from '../hooks/useAuth';

interface RoleGuardProps {
  allowedRoles: readonly Role[];
  children?: ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const session = useSession();

  if (!session) {
    return <Navigate to="/dang-nhap" replace />;
  }

  if (!allowedRoles.includes(session.role)) {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
