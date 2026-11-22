import { UiIcon } from '../ui/UiIcon';
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
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
  profile: 'Tài khoản',
  accounts: 'Tài khoản',
  disputes: 'Tranh chấp',
  notifications: 'Thông báo',
};

export function WebLayout() {
  const session = useSession();
  const logout = useLogout();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!session) return <Outlet />;

  const role = session.role;
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
      {primaryLabels[id]}
    </NavLink>
  ));

  return (
    <div className="workspace-shell">
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
            <span>
              {roleLabels[role]}
              {session.isDemo && ' · Demo'}
            </span>
            <button
              type="button"
              className="workspace-menu-button"
              aria-expanded={menuOpen}
              aria-controls="workspace-menu"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              Menu
            </button>
          </div>
        </div>
      </header>
      <div className="workspace-frame">
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
                {label}
              </NavLink>
            ))}
          </nav>
          <button type="button" onClick={() => void logout()}>
            Đăng xuất
          </button>
        </aside>
        <main className="workspace-content">
          <Outlet />
        </main>
      </div>
      <nav className="workspace-mobile-nav" aria-label="Điều hướng điện thoại">
        {primaryLinks}
      </nav>
    </div>
  );
}
