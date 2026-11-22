import { DashboardPage } from '../features/users/pages/DemoPage';
import { FarmingPage } from '../features/farming/pages/FarmingPage';
import { ServiceLayout } from '../shared/ui/ServiceLayout';
import { ChatPage } from '../features/chat/pages/ChatPage';
import {
  PaymentsPage,
  ContractPage,
  CreateContractPage,
  DisputePage,
} from '../features/payments/pages/PaymentsPage';
import { NotificationsPage } from '../features/notifications/pages/NotificationsPage';
import { ProfilePage, PublicProfilePage } from '../features/users/pages/ProfilePage';
import { AccountsPage } from '../features/users/pages/AccountsPage';
import { VerifyEmailPage } from '../features/users/pages/VerifyEmailPage';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { queryClient } from '../shared/api/runtime';
import { AuthPage } from '../features/users/pages/AuthPage';
import { WebLayout } from '../shared/layouts/WebLayout';
import { RoleGuard } from '../shared/layouts/RoleGuard';
import { useSession } from '../shared/hooks/useAuth';
import { MarketplacePage } from '../features/trading/pages/MarketplacePage';
import { MyListingsPage } from '../features/trading/pages/MyListingsPage';
import { CreateListingPage } from '../features/trading/pages/CreateListingPage';
import { ListingDetailPage } from '../features/trading/pages/ListingDetailPage';
import { ListingOffersPage } from '../features/trading/pages/ListingOffersPage';
import { MyOffersPage } from '../features/trading/pages/MyOffersPage';
import '../features/trading/pages/trading.css';

function RootRedirect() {
  const session = useSession();
  if (!session) {
    return <Navigate to="/dang-nhap" replace />;
  }
  return <DashboardPage />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/thong-bao" element={<NotificationsPage />} />
          <Route path="/thong-bao/:notificationId" element={<NotificationsPage />} />
          <Route element={<ServiceLayout />}>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:conversationId" element={<ChatPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/payments/new" element={<CreateContractPage />} />
            <Route path="/payments/contracts/:contractId" element={<ContractPage />} />
            <Route path="/payments/disputes/:disputeId" element={<DisputePage />} />
          </Route>
          <Route path="/xac-minh-email" element={<VerifyEmailPage />} />
          <Route path="/tai-khoan" element={<ProfilePage />} />
          <Route path="/nguoi-dung/:accountId" element={<PublicProfilePage />} />
          <Route path="/quan-ly-tai-khoan" element={<AccountsPage />} />
          <Route path="/demo" element={<Navigate to="/" replace />} />
          <Route path="/dang-nhap" element={<AuthPage mode="login" />} />
          <Route path="/dang-ky" element={<AuthPage mode="register" />} />

          {/* Protected Application Shell */}
          <Route element={<WebLayout />}>
            <Route index element={<RootRedirect />} />

            {/* Trader / Admin Routes */}
            <Route element={<RoleGuard allowedRoles={['TRADER', 'ADMIN']} />}>
              <Route path="/thi-truong" element={<MarketplacePage />} />
            </Route>

            {/* Trader Offers */}
            <Route element={<RoleGuard allowedRoles={['TRADER']} />}>
              <Route path="/bao-gia" element={<MyOffersPage />} />
            </Route>

            {/* Farmer Routes */}
            <Route element={<RoleGuard allowedRoles={['FARMER']} />}>
              <Route path="/ruong-vu" element={<FarmingPage page="plots" />} />
              <Route path="/nhat-ky" element={<FarmingPage page="journal" />} />
              <Route path="/chi-phi" element={<FarmingPage page="costs" />} />
              <Route path="/bai-dang" element={<MyListingsPage />} />
              <Route path="/bai-dang/tao-moi" element={<CreateListingPage />} />
              <Route path="/bai-dang/:listingId/bao-gia" element={<ListingOffersPage />} />
            </Route>

            {/* Shared Listing Detail Route (All Authenticated Roles) */}
            <Route element={<RoleGuard allowedRoles={['FARMER', 'TRADER', 'ADMIN']} />}>
              <Route path="/bai-dang/:listingId" element={<ListingDetailPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
