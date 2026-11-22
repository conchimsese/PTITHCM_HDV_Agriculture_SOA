import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { logoutUser, useSession } from '../hooks/useUsers';
import { useUnreadCount } from '../../notifications/hooks/useNotifications';
import '../pages/users.css';
export function UserLayout({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const session = useSession();
  const unread = useUnreadCount();
  const [busy, setBusy] = useState(false);
  if (!session?.tokens) return <Navigate to="/dang-nhap" replace />;
  return (
    <div className="user-shell">
      <aside className="user-sidebar">
        <Link className="user-brand" to="/tai-khoan">
          ❧ Ruộng Lúa Việt
        </Link>
        <p>KẾT NỐI CÙNG PHÁT TRIỂN</p>
        <nav>
          <Link to="/tai-khoan">◉ Hồ sơ cá nhân</Link>
          <Link to="/thong-bao">
            ♧ Thông báo {unread.data && <span>({unread.data.count})</span>}
          </Link>
          {session.role === 'ADMIN' && <Link to="/quan-ly-tai-khoan">▦ Quản lý tài khoản</Link>}
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
