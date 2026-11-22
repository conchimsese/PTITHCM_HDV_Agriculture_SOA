import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAccount } from '../hooks/useAccount';
import './services.css';

export function ServiceLayout() {
  const session = useAccount();
  const { pathname } = useLocation();
  const demoChat =
    session?.isDemo &&
    session.role !== 'ADMIN' &&
    (pathname === '/chat' || pathname.startsWith('/chat/'));

  if (!session) return <Navigate to="/dang-nhap" replace />;

  if (!session.tokens && !demoChat) {
    return (
      <section className="service-app">
        <div className="panel">
          <h1>Chế độ xem thử cục bộ</h1>
          <p>
            Hợp đồng, tiền cọc mô phỏng và tranh chấp yêu cầu phiên đăng nhập máy chủ thực. Vui lòng
            đăng xuất chế độ thử và đăng nhập tài khoản để sử dụng đầy đủ.
          </p>
          <div className="actions">
            <Link to="/">Về tổng quan</Link>
            <Link to="/dang-nhap">Đăng nhập máy chủ</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="service-app">
      <Outlet />
    </div>
  );
}
