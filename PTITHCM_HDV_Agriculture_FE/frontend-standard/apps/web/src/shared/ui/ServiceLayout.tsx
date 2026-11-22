import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { setSession } from '@agri/api-client';
import { useAccount } from '../hooks/useAccount';
import { authApi, queryClient } from '../api/runtime';
import './services.css';
export function ServiceLayout() {
  const session = useAccount();
  const { pathname } = useLocation();
  const demoChat =
    session?.isDemo &&
    session.role !== 'ADMIN' &&
    (pathname === '/chat' || pathname.startsWith('/chat/'));
  if (!session || (!session.tokens && !demoChat)) return <Navigate to="/dang-nhap" replace />;
  return (
    <div className="service-app">
      <header>
        <Link className="brand" to="/chat">
          Ruộng Lúa Việt <small>Kết nối mùa vàng</small>
        </Link>
        <nav>
          <Link to="/chat">Tin nhắn</Link>
          {!demoChat && <Link to="/payments">Hợp đồng & cọc</Link>}
          <Link to="/">Trang chủ</Link>
        </nav>
        <button
          onClick={() => {
            const token = session.tokens?.refreshToken;
            if (token) void authApi.logout(token).catch(() => undefined);
            setSession(null);
            queryClient.clear();
          }}
        >
          Đăng xuất
        </button>
      </header>
      <main>
        <Outlet />
      </main>
      <footer>Trao đổi rõ ràng · Giao dịch an tâm</footer>
    </div>
  );
}
