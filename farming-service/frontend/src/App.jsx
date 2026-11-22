import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FarmingProvider } from './contexts/FarmingContext';
import Layout from './components/layout/Layout';

// Pages
import Dashboard from './pages/Dashboard/Dashboard';
import PlotsPage from './pages/Plots/PlotsPage';
import CropSeasonsPage from './pages/CropSeasons/CropSeasonsPage';
import FarmingLogsPage from './pages/FarmingLogs/FarmingLogsPage';
import CostsPage from './pages/Costs/CostsPage';
import ReportsPage from './pages/Reports/ReportsPage';

// Styles matching UI Reference V5
import './styles/styles.css';
import './styles/v5.css';
import './styles/mobile.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FarmingProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="plots" element={<PlotsPage />} />
              <Route path="season" element={<CropSeasonsPage />} />
              <Route path="journal" element={<FarmingLogsPage />} />
              <Route path="costs" element={<CostsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </FarmingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
