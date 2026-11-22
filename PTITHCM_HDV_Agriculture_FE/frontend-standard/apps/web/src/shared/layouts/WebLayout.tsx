import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { modulesForRole, roleLabels } from '@agri/contracts';
import { useLogout, useSession } from '../hooks/useAuth';
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

const moduleIconMap: Record<string, string> = {
  dashboard: '📊',
  marketplace: '🛒',
  listings: '🌾',
  offers: '🏷️',
  plots: '🏞️',
  journal: '📖',
  costs: '💰',
  chat: '💬',
  contracts: '📜',
  deposits: '🔒',
  disputes: '⚖️',
  notifications: '🔔',
  profile: '👤',
  accounts: '👥',
};

export function WebLayout() {
  const session = useSession();
  const logout = useLogout();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!session) {
    // If not logged in, layout will be handled by RoleGuard / Route redirects
    return <Outlet />;
  }

  const role = session.role;
  const userModules = modulesForRole(role);
  const homePath = '/';

  return (
    <div className={`web-layout ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="layout-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className="layout-sidebar" aria-label="Menu chính">
        <div className="sidebar-brand">
          <Link to={homePath} className="brand-logo" onClick={() => setMobileMenuOpen(false)}>
            <span className="brand-leaf" aria-hidden="true">
              ❧
            </span>
            <div className="brand-text">
              <span className="brand-title">Ruộng Lúa Việt</span>
              <span className="brand-subtitle">KẾT NỐI GIÁ TRỊ NÔNG NGHIỆP</span>
            </div>
          </Link>
        </div>

        {/* User Card */}
        <div className="sidebar-user">
          <div className="user-avatar" aria-hidden="true">
            {role === 'FARMER' ? '🌾' : role === 'TRADER' ? '💼' : '🛡️'}
          </div>
          <div className="user-info">
            <span className="user-role-badge badge-{role.toLowerCase()}">{roleLabels[role]}</span>
            <span className="user-id" title={session.accountId}>
              ID: {session.accountId.slice(0, 8)}…
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          <ul>
            {userModules
              .filter(
                (item) =>
                  !session.isDemo ||
                  [
                    'dashboard',
                    ...(role === 'FARMER'
                      ? ['listings', 'plots', 'journal', 'costs']
                      : role === 'TRADER'
                        ? ['marketplace', 'offers']
                        : []),
                  ].includes(item.id),
              )
              .map((item) => {
                const path = modulePathMap[item.id] || `/${item.id}`;
                const icon = moduleIconMap[item.id] || '•';
                const isCurrent =
                  location.pathname === path ||
                  (path !== '/' && location.pathname.startsWith(`${path}/`));

                return (
                  <li key={item.id}>
                    <NavLink
                      to={path}
                      className={({ isActive }) =>
                        `nav-item ${isActive || isCurrent ? 'active' : ''}`
                      }
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="nav-icon" aria-hidden="true">
                        {icon}
                      </span>
                      <span className="nav-label">{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
          </ul>
        </nav>

        {/* Sidebar Footer with Demo Switcher & Logout */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={() => void logout()}
            aria-label="Đăng xuất khỏi hệ thống"
          >
            <span aria-hidden="true">🚪</span> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Body */}
      <div className="layout-body">
        {/* Top Header Bar */}
        <header className="layout-header">
          <button
            type="button"
            className="mobile-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Mở trình đơn"
          >
            ☰
          </button>

          <div className="header-breadcrumbs">
            <span className="header-platform">Nông Nghiệp Số</span>
            <span className="header-separator">/</span>
            <span className="header-role">{roleLabels[role]}</span>
          </div>

          <div className="header-actions">
            {role === 'FARMER' && (
              <Link to="/bai-dang/tao-moi" className="header-action-btn primary">
                + Đăng bài bán lúa
              </Link>
            )}
            {role === 'TRADER' && (
              <Link to="/thi-truong" className="header-action-btn secondary">
                🔍 Xem thị trường
              </Link>
            )}
            <div className="header-status-indicator">
              <span className="status-dot online" />{' '}
              {session.isDemo ? 'Chế độ demo' : 'Phiên đăng nhập'}
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
