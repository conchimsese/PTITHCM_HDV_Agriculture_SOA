import { UiIcon } from '../ui/UiIcon';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
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
  deposits: '/payments?view=deposits',
  disputes: '/payments?view=disputes',
  notifications: '/thong-bao',
  profile: '/tai-khoan',
  accounts: '/quan-ly-tai-khoan',
};

function isModuleActive(id: string, role: string, pathname: string, search: string): boolean {
  if (id === 'dashboard') return pathname === '/';
  if (id === 'marketplace') {
    if (pathname.startsWith('/thi-truong')) return true;
    return (
      role === 'TRADER' &&
      pathname.startsWith('/bai-dang/') &&
      !pathname.startsWith('/bai-dang/tao-moi') &&
      !pathname.endsWith('/bao-gia')
    );
  }
  if (id === 'listings') return pathname.startsWith('/bai-dang') && !pathname.endsWith('/bao-gia');
  if (id === 'offers') return pathname.startsWith('/bao-gia') || pathname.endsWith('/bao-gia');
  if (id === 'plots') return pathname.startsWith('/ruong-vu');
  if (id === 'journal') return pathname.startsWith('/nhat-ky');
  if (id === 'costs') return pathname.startsWith('/chi-phi');
  if (id === 'chat') return pathname.startsWith('/chat');
  if (id === 'notifications') return pathname.startsWith('/thong-bao');
  if (id === 'profile')
    return pathname.startsWith('/tai-khoan') || pathname.startsWith('/nguoi-dung');
  if (id === 'accounts') return pathname.startsWith('/quan-ly-tai-khoan');
  if (id === 'contracts' || id === 'deposits' || id === 'disputes') {
    if (!pathname.startsWith('/payments')) return false;
    if (pathname.startsWith('/payments/disputes/')) return id === 'disputes';
    if (pathname.startsWith('/payments/contracts/') || pathname === '/payments/new') {
      return id === 'contracts';
    }
    const view = new URLSearchParams(search).get('view');
    if (view === 'deposits') return id === 'deposits';
    if (view === 'disputes') return id === 'disputes';
    return role === 'ADMIN' ? id === 'disputes' : id === 'contracts';
  }
  return false;
}

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
  const { pathname, search } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, search]);

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
  const isFullFrameChat = pathname.startsWith('/chat') && role !== 'ADMIN';
  const unreadCount = !session.isDemo ? (unread.data?.count ?? 0) : 0;
  const modules = modulesForRole(role).filter(({ id }) => {
    if (!modulePathMap[id]) return false;
    if (!session.isDemo || id === 'dashboard' || (id === 'chat' && role !== 'ADMIN')) return true;
    if (role === 'FARMER') return ['plots', 'journal', 'costs', 'listings'].includes(id);
    return role === 'TRADER' && ['marketplace', 'offers'].includes(id);
  });
  const primary = primaryByRole[role].filter((id) => modules.some((item) => item.id === id));

  const primaryLinks = primary.map((id) => {
    const active = isModuleActive(id, role, pathname, search);
    return (
      <Link
        key={id}
        to={modulePathMap[id]}
        aria-current={active ? 'page' : undefined}
        className={active ? 'active' : undefined}
      >
        <UiIcon name={id} />
        <span>{primaryLabels[id]}</span>
        {id === 'notifications' && unreadCount > 0 && (
          <span className="nav-unread-pill" aria-label={`${unreadCount} thông báo chưa đọc`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Link>
    );
  });

  return (
    <div className={isFullFrameChat ? 'workspace-shell workspace-shell--chat' : 'workspace-shell'}>
      <a className="skip-link" href="#main-content">
        Chuyển đến nội dung chính
      </a>
      <header className="workspace-top">
        <div className="workspace-top-inner">
          <Link className="workspace-brand" to="/">
            <span className="brand-leaf" aria-hidden="true">
              <UiIcon name="rice" size={22} />
            </span>
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
      <div
        className={isFullFrameChat ? 'workspace-frame workspace-frame--chat' : 'workspace-frame'}
      >
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
            {modules.map(({ id, label }) => {
              const active = isModuleActive(id, role, pathname, search);
              return (
                <Link
                  key={id}
                  to={modulePathMap[id]}
                  aria-current={active ? 'page' : undefined}
                  className={active ? 'active' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  <UiIcon name={id} />
                  <span>{label}</span>
                  {id === 'notifications' && unreadCount > 0 && (
                    <span className="nav-unread-pill">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
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
