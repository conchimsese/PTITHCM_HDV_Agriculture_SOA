import { UiIcon } from '../ui/UiIcon';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { modulesForRole, roleLabels } from '@agri/contracts';
import { useLogout, useSession } from '../hooks/useAuth';
import { useUnreadCount } from '../../features/notifications/hooks/useNotifications';
import './web-layout.css';

const modulePathMap: Record<string, string> = {
  dashboard: '/',
  marketplace: '/thi-truong',
  listings: '/bai-dang',
  offers: '/bao-gia',
  plots: '/ruong-vu',
  journal: '/nhat-ky',
  costs: '/chi-phi',
  chat: '/chat',
  contracts: '/payments',
  deposits: '/payments',
  disputes: '/payments',
  notifications: '/thong-bao',
  profile: '/tai-khoan',
  accounts: '/quan-ly-tai-khoan',
};

const primaryByRole = {
  FARMER: ['dashboard', 'plots', 'listings', 'chat', 'profile'],
  TRADER: ['dashboard', 'marketplace', 'offers', 'chat', 'profile'],
  ADMIN: ['dashboard', 'accounts', 'disputes', 'notifications', 'profile'],
};

const primaryLabels: Record<string, string> = {
  dashboard: 'Trang chủ',
  plots: 'Ruộng lúa',
  listings: 'Bán lúa',
  marketplace: 'Bảng tin',
  offers: 'Báo giá',
  chat: 'Tin nhắn',
  profile: 'Hồ sơ',
  accounts: 'Quản lý TK',
  disputes: 'Tranh chấp',
  notifications: 'Thông báo',
};

export function WebLayout() {
  const session = useSession();
  const logout = useLogout();
  const unread = useUnreadCount();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  if (!session) return <Outlet />;

  const role = session.role;
  const unreadCount = !session.isDemo ? (unread.data?.count ?? 0) : 0;
  const modules = modulesForRole(role).filter(({ id }) => {
    if (!modulePathMap[id]) return false;
    if (!session.isDemo || id === 'dashboard' || (id === 'chat' && role !== 'ADMIN')) return true;
    if (role === 'FARMER') return ['plots', 'journal', 'costs', 'listings'].includes(id);
    return role === 'TRADER' && ['marketplace', 'offers'].includes(id);
  });
  const primary = primaryByRole[role].filter((id) => modules.some((item) => item.id === id));

  const primaryLinks = primary.map((id) => (
    <NavLink key={id} to={modulePathMap[id]} end={id === 'dashboard'}>
      <UiIcon name={id} />
      <span>{primaryLabels[id]}</span>
      {id === 'notifications' && unreadCount > 0 && (
        <span className="nav-unread-pill" aria-label={`${unreadCount} thông báo chưa đọc`}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </NavLink>
  ));

  return (
    <div className="workspace-shell">
      <a className="skip-link" href="#main-content">
        Chuyển đến nội dung chính
      </a>
      <header className="workspace-top">
        <div className="workspace-top-inner">
          <Link className="workspace-brand" to="/">
            <span aria-hidden="true">❧</span>
            <div>
              <strong>Ruộng Lúa Việt</strong>
              <small>Gắn mùa vụ · Nối giao thương</small>
            </div>
          </Link>
          <nav className="workspace-top-nav" aria-label="Điều hướng chính">
            {primaryLinks}
          </nav>
          <div className="workspace-session">
            {!session.isDemo && (
              <Link
                className="workspace-bell"
                to="/thong-bao"
                aria-label={unreadCount > 0 ? `Thông báo (${unreadCount} chưa đọc)` : 'Thông báo'}
                title="Thông báo"
              >
                <UiIcon name="notifications" />
                {unreadCount > 0 && (
                  <span className="nav-unread-pill">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </Link>
            )}
            <span className={session.isDemo ? 'workspace-role-pill demo' : 'workspace-role-pill'}>
              {roleLabels[role]}
              {session.isDemo && ' · Demo trình duyệt'}
            </span>
            <button
              type="button"
              className="workspace-menu-button"
              aria-expanded={menuOpen}
              aria-controls="workspace-menu"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? 'Đóng' : 'Menu'}
            </button>
          </div>
        </div>
      </header>
      <div className="workspace-frame">
        {menuOpen && (
          <div
            className="workspace-menu-backdrop"
            aria-hidden="true"
            onClick={() => setMenuOpen(false)}
          />
        )}
        <aside id="workspace-menu" className={menuOpen ? 'workspace-menu open' : 'workspace-menu'}>
          <nav aria-label="Khu vực làm việc">
            <h2>Khu vực làm việc</h2>
            {modules.map(({ id, label }) => (
              <NavLink
                key={id}
                to={modulePathMap[id]}
                end={id === 'dashboard'}
                onClick={() => setMenuOpen(false)}
              >
                <UiIcon name={id} />
                <span>{label}</span>
                {id === 'notifications' && unreadCount > 0 && (
                  <span className="nav-unread-pill">{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </NavLink>
            ))}
          </nav>
          <button type="button" onClick={() => void logout()}>
            Đăng xuất
          </button>
        </aside>
        <main id="main-content" className="workspace-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <nav className="workspace-mobile-nav" aria-label="Điều hướng điện thoại">
        {primaryLinks}
      </nav>
    </div>
  );
}
