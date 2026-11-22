import type { ReactNode } from 'react';
import { Link, Navigate, NavLink } from 'react-router-dom';
import { useState } from 'react';
import { logoutUser, useSession } from '../hooks/useUsers';
import { useUnreadCount } from '../../notifications/hooks/useNotifications';
import { UiIcon } from '../../../shared/ui/UiIcon';
import '../pages/users.css';
export function UserLayout({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const session = useSession();
  const unread = useUnreadCount();
  const [busy, setBusy] = useState(false);
  if (!session?.tokens) return <Navigate to="/dang-nhap" replace />;
  return (
    <div className="user-shell">
      <aside className="user-sidebar">
        <Link className="user-brand" to="/">
          <UiIcon name="plots" /> Ruộng Lúa Việt
        </Link>

        <nav aria-label="Tài khoản và thông báo">
          <NavLink to="/" end>
            <UiIcon name="dashboard" /> Trang chủ
          </NavLink>
          <NavLink to="/tai-khoan">
            <UiIcon name="profile" /> Hồ sơ cá nhân
          </NavLink>
          <NavLink to="/thong-bao">
            <UiIcon name="notifications" /> Thông báo{' '}
            {unread.data && <span>({unread.data.count})</span>}
          </NavLink>
          {session.role === 'ADMIN' && (
            <NavLink to="/quan-ly-tai-khoan">
              <UiIcon name="accounts" /> Quản lý tài khoản
            </NavLink>
          )}
        </nav>
        <button
          disabled={busy}
          onClick={() => {
            setBusy(true);
            void logoutUser()
              .catch(() => undefined)
              .finally(() => setBusy(false));
          }}
        >
          {busy ? 'Đang đăng xuất…' : 'Đăng xuất'}
        </button>
      </aside>
      <main className="user-main">
        {admin && session.role !== 'ADMIN' ? (
          <div className="user-empty">
            <h1>Không có quyền truy cập</h1>
            <p>Chức năng này dành cho quản trị viên.</p>
            <Link to="/tai-khoan">Về hồ sơ</Link>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
export function UserError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="user-alert" role="alert">
      <p>{error.message}</p>
      <button onClick={retry}>Thử lại</button>
    </div>
  );
}
