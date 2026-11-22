import { accountStatusLabels, userRoleLabels } from '@agri/contracts';
import { useAccounts } from '../hooks/useUsers';
import { useListings } from '../../trading/hooks/useListings';
import { useOffers } from '../../trading/hooks/useOffers';
import { formatVND, formatYield } from '../../../shared/utils/formatters';
import { UiIcon } from '../../../shared/ui/UiIcon';
import { useState } from 'react';
import { load, selectedPlot, selectedPlotKey } from '../../farming/demo';
import { Link } from 'react-router-dom';
import { useSession } from '../../../shared/hooks/useAuth';
import './dashboard.css';
export function DashboardPage() {
  const session = useSession();
  if (!session) return null;
  if (session.role === 'FARMER') return <FarmerDashboard demo={Boolean(session.isDemo)} />;
  return session.role === 'TRADER' ? (
    <TraderDashboard accountId={session.accountId} demo={Boolean(session.isDemo)} />
  ) : (
    <AdminDashboard demo={Boolean(session.isDemo)} />
  );
}

function TraderDashboard({ accountId, demo }: { accountId: string; demo: boolean }) {
  const listings = useListings({ status: 'OPEN', size: 3 });
  const offers = useOffers({ traderId: accountId, size: 3 });
  return (
    <div className="season-dashboard">
      <div className="season-dashboard-main">
        <header>
          <p className="dash-kicker">THỊ TRƯỜNG LÚA</p>
          <h1>Tìm nguồn lúa phù hợp</h1>
          <p>Xem nguồn cung và theo dõi báo giá của bạn.</p>
        </header>
        <section className="dash-card season-hero">
          <h2>Bảng tin bán lúa</h2>
          <p>Xem giống lúa, sản lượng dự kiến và vị trí ruộng trước khi gửi báo giá.</p>
          <div className="season-links">
            <Link className="season-primary" to="/thi-truong">
              Tìm nguồn lúa →
            </Link>
            <Link to="/bao-gia">Báo giá của tôi</Link>
          </div>
        </section>
        <section className="dash-card">
          <h2>Nguồn lúa đang mở</h2>
          {listings.isPending && <p role="status">Đang tải nguồn lúa…</p>}
          {listings.isError && (
            <p role="alert">
              Chưa tải được nguồn lúa.{' '}
              <button onClick={() => void listings.refetch()}>Thử lại</button>
            </p>
          )}
          {listings.data?.items.length === 0 && <p>Chưa có bài đăng mở nhận báo giá.</p>}
          {listings.data?.items.map((listing) => (
            <article className="dashboard-row" key={listing.listingId}>
              <UiIcon name="listings" />
              <div>
                <Link to={'/bai-dang/' + listing.listingId}>{listing.seedType}</Link>
                <small>
                  {formatYield(listing.estimatedYield)} · {formatVND(listing.expectedPrice)}
                </small>
              </div>
            </article>
          ))}
        </section>
      </div>
      <aside className="season-dashboard-aside" aria-label="Hoạt động thu mua">
        <section className="dash-card">
          <h2>Báo giá của tôi</h2>
          <p>
            {offers.data
              ? offers.data.totalElements + ' báo giá đã gửi'
              : offers.isPending
                ? 'Đang tải báo giá…'
                : 'Chưa tải được số báo giá.'}
          </p>
          <Link to="/bao-gia">Xem báo giá →</Link>
        </section>
        <section className="dash-card">
          <h2>Kết nối</h2>
          <div className="season-related">
            <Link to="/chat">Tin nhắn →</Link>
            {!demo && <Link to="/payments">Hợp đồng và cọc →</Link>}
          </div>
        </section>
      </aside>
    </div>
  );
}

function AdminDashboard({ demo }: { demo: boolean }) {
  return (
    <div className="season-dashboard">
      <div className="season-dashboard-main">
        <header>
          <p className="dash-kicker">QUẢN TRỊ</p>
          <h1>Tổng quan hệ thống</h1>
          <p>Theo dõi tài khoản và mở công việc cần xử lý.</p>
        </header>
        {demo ? (
          <section className="dash-card">
            <h2>Quản lý tài khoản</h2>
            <p>Đăng nhập bằng tài khoản quản trị trên máy chủ để xem và thao tác.</p>
          </section>
        ) : (
          <AccountOverview />
        )}
      </div>
      {!demo && (
        <aside className="season-dashboard-aside" aria-label="Công việc quản trị">
          <section className="dash-card">
            <h2>Hoạt động</h2>
            <div className="season-related">
              <Link to="/thong-bao">Thông báo →</Link>
              <Link to="/payments">Khu vực hợp đồng và tranh chấp →</Link>
            </div>
          </section>
        </aside>
      )}
    </div>
  );
}

function AccountOverview() {
  const accounts = useAccounts({ page: 0 });
  return (
    <section className="dash-card">
      <h2>Quản lý tài khoản</h2>
      {accounts.isPending && <p role="status">Đang tải tài khoản…</p>}
      {accounts.isError && (
        <p role="alert">
          Chưa tải được tài khoản. <button onClick={() => void accounts.refetch()}>Thử lại</button>
        </p>
      )}
      {accounts.data && <p>{accounts.data.totalElements} tài khoản</p>}
      {accounts.data?.items.slice(0, 4).map((account) => (
        <div className="dashboard-row" key={account.accountId}>
          <UiIcon name="profile" />
          <div>
            <strong>{account.username}</strong>
            <small>
              {userRoleLabels[account.role]} · {accountStatusLabels[account.status]}
            </small>
          </div>
        </div>
      ))}
      <Link to="/quan-ly-tai-khoan">Mở danh sách tài khoản →</Link>
    </section>
  );
}
const farmingActions = [
  { to: '/nhat-ky', label: 'Ghi việc đã làm', icon: 'journal' },
  { to: '/chi-phi', label: 'Ghi chi phí', icon: 'costs' },
  { to: '/ruong-vu', label: 'Xem ruộng lúa', icon: 'plots' },
  { to: '/bai-dang/tao-moi', label: 'Đăng bán lúa', icon: 'listings' },
];

function FarmerDashboard({ demo }: { demo: boolean }) {
  const [data] = useState(() => (demo ? load() : undefined));
  const [plotId, setPlotId] = useState(() => data && selectedPlot(data)?.id);
  const plot = data?.plots.find((item) => item.id === plotId);
  const logs = data?.journal
    .filter((item) => item.plotId === plotId && item.season === plot?.season)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  return (
    <div className="season-dashboard">
      <div className="season-dashboard-main">
        <header>
          <p className="dash-kicker">BẢNG TIN MÙA VỤ</p>
          <h1>Hôm nay ruộng lúa thế nào?</h1>
          <p>Theo dõi công việc và ghi chép theo từng mùa vụ.</p>
        </header>

        <section className="dash-card season-hero">
          <p className="season-chip">{demo ? 'Mùa vụ minh họa' : 'Mùa vụ của bạn'}</p>
          <h2>
            {plot ? [plot.season || 'Chưa có mùa vụ', plot.name].join(' · ') : 'Ruộng và mùa vụ'}
          </h2>
          {plot && <p>{[plot.crop, plot.area].filter(Boolean).join(' · ')}</p>}
          <div className="season-links">
            <Link className="season-primary" to="/ruong-vu">
              Xem mùa vụ →
            </Link>
            <Link to="/nhat-ky">Ghi nhật ký</Link>
          </div>
        </section>

        <section className="dash-card">
          <h2>Hôm nay bà con muốn làm gì?</h2>
          <div className="season-actions">
            {farmingActions.map(({ to, label, icon }) => (
              <Link key={to} to={to}>
                <UiIcon name={icon} />
                {label}
              </Link>
            ))}
          </div>
        </section>

        <section className="dash-card">
          <h2>Nhật ký canh tác</h2>
          <div className="season-timeline">
            {logs?.length ? (
              logs.map((item) => (
                <article key={item.id}>
                  <strong>{item.detail}</strong>
                  <small>
                    {item.date} · {plot?.name}
                  </small>
                </article>
              ))
            ) : (
              <p>Chưa có công việc được hiển thị cho mùa vụ này.</p>
            )}
          </div>
          <Link to="/nhat-ky">Xem nhật ký →</Link>
        </section>
      </div>

      <aside className="season-dashboard-aside" aria-label="Thông tin mùa vụ">
        <section className="dash-card">
          <h2>Ruộng đang theo dõi</h2>
          {data && (
            <label className="season-switch">
              Ruộng đang chọn
              <select
                value={plotId}
                onChange={(event) => {
                  sessionStorage.setItem(selectedPlotKey, event.target.value);
                  setPlotId(event.target.value);
                }}
              >
                {data.plots.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.area}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p>{plot?.season || 'Chọn ruộng để xem mùa vụ.'}</p>
          <Link to="/ruong-vu">Xem danh sách ruộng →</Link>
        </section>
        <section className="dash-card">
          <h2>Công việc liên quan</h2>
          <div className="season-related">
            <Link to="/chi-phi">Chi phí canh tác →</Link>
            <Link to="/bai-dang">Bài đăng bán lúa →</Link>
          </div>
        </section>
      </aside>
    </div>
  );
}
