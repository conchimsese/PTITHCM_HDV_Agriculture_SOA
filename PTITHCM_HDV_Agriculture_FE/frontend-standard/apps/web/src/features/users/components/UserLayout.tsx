import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useSession } from '../hooks/useUsers';
import '../pages/users.css';

export function UserLayout({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const session = useSession();

  if (!session) return <Navigate to="/dang-nhap" replace />;

  if (!session.tokens) {
    return (
      <section className="user-page">
        <div className="user-empty">
          <h1>Chế độ xem thử cục bộ</h1>
          <p>
            Hồ sơ tài khoản, thông báo và quản lý người dùng kết nối trực tiếp máy chủ xác thực.
          </p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
            <Link to="/">Về tổng quan</Link>
            <Link to="/dang-nhap">Đăng nhập máy chủ</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="user-page">
      {admin && session.role !== 'ADMIN' ? (
        <div className="user-empty">
          <h1>Không có quyền truy cập</h1>
          <p>Chức năng này dành cho quản trị viên.</p>
          <Link to="/tai-khoan">Về hồ sơ</Link>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export function UserError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="user-alert" role="alert">
      <p>{error.message}</p>
      <button type="button" onClick={retry}>
        Thử lại
      </button>
    </div>
  );
}
