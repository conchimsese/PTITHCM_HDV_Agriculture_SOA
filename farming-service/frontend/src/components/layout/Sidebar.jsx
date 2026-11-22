import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '../common/Icon';
import PlotSeasonSwitcher from '../common/PlotSeasonSwitcher';

const FARMER_LINKS = [
  { to: '/', label: 'Bảng tin mùa vụ', icon: 'home' },
  { to: '/plots', label: 'Ruộng lúa', icon: 'field' },
  { to: '/season', label: 'Mùa vụ canh tác', icon: 'sprout' },
  { to: '/journal', label: 'Nhật ký canh tác', icon: 'book' },
  { to: '/costs', label: 'Chi phí canh tác', icon: 'wallet' },
  { to: '/reports', label: 'Báo cáo & PDF', icon: 'file' }
];

export function Sidebar() {
  return (
    <aside className="side-col">
      <div className="panel">
        <div className="panel-heading">Không gian nông dân</div>
        <nav className="side-nav">
          {FARMER_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}
            >
              <Icon name={link.icon} size="sm" />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <hr className="side-line" />
        <div className="side-meta">
          <small>Farming Service v1.0</small>
        </div>
      </div>

      <div className="panel plot-switch-card">
        <div className="panel-heading">Chuyển nhanh giữa các ruộng</div>
        <PlotSeasonSwitcher withPlot={true} />
        <div className="button-row" style={{ marginTop: '12px' }}>
          <NavLink to="/season" className="btn sm block">
            <span>Chi tiết mùa vụ</span>
            <Icon name="arrow" size="sm" />
          </NavLink>
        </div>
      </div>

      <div className="side-footer">
        BA–SOA · Contract v2.1<br />
        Hệ thống Microservices Quản lý Lúa nước.
      </div>
    </aside>
  );
}

export default Sidebar;
