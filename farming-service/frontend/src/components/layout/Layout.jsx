import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import PlotSeasonSwitcher from '../common/PlotSeasonSwitcher';

export function Layout() {
  return (
    <div className="app-shell">
      <div className="demo-ribbon">
        <span className="status-dot"></span>
        <strong>FARMING SERVICE FRONTEND</strong> · Kết nối Backend REST API (Port 8082) ·
        <span className="ribbon-side">BA–SOA v2.1</span>
      </div>

      <Header />

      <div className="main-wrap">
        <Sidebar />

        <main className="content-col">
          {/* Mobile switcher bar at top of content */}
          <div className="mobile-only-switch">
            <PlotSeasonSwitcher withPlot={true} />
          </div>

          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

export default Layout;
