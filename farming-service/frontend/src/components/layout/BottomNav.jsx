import React from 'react';
import { NavLink } from 'react-router-dom';
import Icon from '../common/Icon';

const MOBILE_NAV = [
  { to: '/', label: 'Bảng tin', icon: 'home' },
  { to: '/plots', label: 'Ruộng', icon: 'field' },
  { to: '/season', label: 'Mùa vụ', icon: 'sprout' },
  { to: '/journal', label: 'Nhật ký', icon: 'book' },
  { to: '/costs', label: 'Chi phí', icon: 'wallet' }
];

export function BottomNav() {
  return (
    <nav className="footer-nav" aria-label="Điều hướng trên điện thoại">
      {MOBILE_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `footer-item ${isActive ? 'active' : ''}`}
        >
          <Icon name={item.icon} size="sm" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNav;
