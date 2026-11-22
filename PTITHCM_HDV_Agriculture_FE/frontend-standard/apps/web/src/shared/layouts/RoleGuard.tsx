import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from '@agri/contracts';
import { roleLabels } from '@agri/contracts';
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
    const defaultRoute = session.role === 'FARMER' ? '/bai-dang' : '/thi-truong';
    const allowedLabels = allowedRoles.map((r) => roleLabels[r]).join(', ');

    return (
      <div className="role-guard-fallback">
        <div className="role-guard-card">
          <span className="role-guard-icon" aria-hidden="true">
            🔒
          </span>
          <h2>Không có quyền truy cập</h2>
          <p>
            Trang này chỉ dành cho vai trò <strong>{allowedLabels}</strong>. Vai trò hiện tại của
            bạn là <strong>{roleLabels[session.role]}</strong>.
          </p>
          <Navigate to={defaultRoute} replace />
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
}
