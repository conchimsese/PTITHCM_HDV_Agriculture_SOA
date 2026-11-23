import { accountStatusLabels, userRoleLabels } from '@agri/contracts';
import { useAccounts } from '../hooks/useUsers';
import { useListings } from '../../trading/hooks/useListings';
import { useOffers } from '../../trading/hooks/useOffers';
import { formatArea, formatVND, formatYield } from '../../../shared/utils/formatters';
import { UiIcon } from '../../../shared/ui/UiIcon';
import { getRiceArtwork } from '../../trading/utils/riceArtwork';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { load, selectedPlot, selectedPlotKey } from '../../farming/demo';
import {
  seasonStatusLabels,
  usePlotSeasons,
  usePlots,
  useSeasonReport,
  workTypeLabels,
} from '../../farming/api/farmingApi';
import { useSession } from '../../../shared/hooks/useAuth';
import './dashboard.css';
export function DashboardPage() {
  const session = useSession();
  if (!session) return null;
  if (session.role === 'FARMER') {
    return session.isDemo ? (
      <DemoFarmerDashboard />
    ) : (
      <LiveFarmerDashboard accountId={session.accountId} />
    );
  }
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
          <div className="season-hero-grid">
            <div>
              <h2>Bảng tin bán lúa</h2>
              <p>Xem giống lúa, sản lượng dự kiến và vị trí ruộng trước khi gửi báo giá.</p>
              <div className="season-links">
                <Link className="season-primary" to="/thi-truong">
                  Tìm nguồn lúa →
                </Link>
                <Link className="season-secondary" to="/bao-gia">
                  Báo giá của tôi
                </Link>
              </div>
            </div>
            <figure className="season-hero-art">
              <img src={getRiceArtwork('ST25').src} alt="" />
            </figure>
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
                <small className="tabular-nums">
                  {formatYield(listing.estimatedYield)} · {formatVND(listing.expectedPrice)}
                </small>
              </div>
            </article>
          ))}
        </section>
        <div className="kpi-grid">
          <section className="dash-card kpi-card">
            <small>Nguồn mở hiện tại</small>
            <strong className="kpi-value">{listings.data?.totalElements ?? 0} bài</strong>
            <Link className="kpi-pill" to="/thi-truong">
              → Khám phá thị trường
            </Link>
          </section>
          <section className="dash-card kpi-card">
            <small>Báo giá đã gửi</small>
            <strong className="kpi-value">{offers.data?.totalElements ?? 0} báo giá</strong>
            <Link className="kpi-pill" to="/bao-gia">
              → Xem báo giá
            </Link>
          </section>
        </div>
      </div>
      <aside className="season-dashboard-aside" aria-label="Hoạt động thu mua">
        <section className="dash-card">
          <h2>Báo giá của tôi</h2>
          <p className="tabular-nums">
            {offers.data
              ? offers.data.totalElements + ' báo giá đã gửi'
              : offers.isPending
                ? 'Đang tải báo giá…'
                : 'Chưa tải được số báo giá.'}
          </p>
          <Link className="kpi-pill" to="/bao-gia">
            → Xem báo giá
          </Link>
        </section>
        <section className="dash-card">
          <h2>Kết nối nhanh</h2>
          <div className="season-related">
            <Link to="/chat">
              <UiIcon name="chat" size={18} /> Tin nhắn trao đổi
            </Link>
            {!demo && (
              <Link to="/payments">
                <UiIcon name="contracts" size={18} /> Hợp đồng và cọc mô phỏng
              </Link>
            )}
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
          <p>Theo dõi tài khoản, thông báo và xử lý tranh chấp độc lập.</p>
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
            <h2>Hoạt động quản trị</h2>
            <div className="season-related">
              <Link to="/quan-ly-tai-khoan">
                <UiIcon name="accounts" size={18} /> Quản lý tài khoản
              </Link>
              <Link to="/payments?view=disputes">
                <UiIcon name="disputes" size={18} /> Hồ sơ tranh chấp
              </Link>
              <Link to="/thong-bao">
                <UiIcon name="notifications" size={18} /> Thông báo hệ thống
              </Link>
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

function LiveFarmerDashboard({ accountId }: { accountId: string }) {
  const [selectedPlotId, setSelectedPlotId] = useState(
    () => sessionStorage.getItem(selectedPlotKey) ?? '',
  );
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const plots = usePlots(accountId, true);
  const plot =
    plots.data?.items.find((item) => item.plotId === selectedPlotId) ?? plots.data?.items[0];
  const seasons = usePlotSeasons(accountId, plot?.plotId, Boolean(plot));
  const season =
    seasons.data?.items.find((item) => item.cropSeasonId === selectedSeasonId) ??
    seasons.data?.items[0];
  const report = useSeasonReport(accountId, season?.cropSeasonId, Boolean(season));
  const myListings = useListings({ farmerId: accountId, page: 0, size: 5 });

  const recentLogs = [...(report.data?.farmingLogs ?? [])]
    .sort((a, b) => b.workDate.localeCompare(a.workDate))
    .slice(0, 3);
  const openListingsCount =
    myListings.data?.items.filter((item) => item.status === 'OPEN').length ?? 0;

  return (
    <div className="season-dashboard">
      <div className="season-dashboard-main">
        <header>
          <p className="dash-kicker">BẢNG TIN MÙA VỤ</p>
          <h1>Hôm nay ruộng lúa thế nào?</h1>
          <p>Theo dõi ruộng lúa, nhật ký canh tác, chi phí và bài đăng bán lúa thực tế của bạn.</p>
        </header>

        <section className="dash-card season-hero">
          <div className="season-hero-grid">
            <div>
              <p className="season-chip">
                <UiIcon name="rice" size={14} />
                {season?.status
                  ? (seasonStatusLabels[season.status] ?? season.status)
                  : 'Mùa vụ của bạn'}
              </p>
              {plots.isPending ? (
                <h2>Đang tải thông tin ruộng và mùa vụ…</h2>
              ) : plots.isError ? (
                <>
                  <h2>Chưa tải được dữ liệu ruộng lúa</h2>
                  <p>{plots.error.message}</p>
                  <div className="season-links">
                    <button
                      type="button"
                      className="season-primary"
                      onClick={() => void plots.refetch()}
                    >
                      Thử lại
                    </button>
                  </div>
                </>
              ) : !plot ? (
                <>
                  <h2>Chưa có thửa ruộng nào</h2>
                  <p>
                    Tạo thửa ruộng đầu tiên để bắt đầu theo dõi mùa vụ, nhật ký và đăng bán lúa.
                  </p>
                  <div className="season-links">
                    <Link className="season-primary" to="/ruong-vu">
                      Thêm thửa ruộng →
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <h2>{[season?.seasonName || 'Chưa có mùa vụ', plot.name].join(' · ')}</h2>
                  <p className="tabular-nums">
                    {[
                      season?.cropType ? `Giống ${season.cropType}` : null,
                      plot.area ? formatArea(Number(plot.area)) : null,
                      plot.location,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <div className="season-links">
                    <Link className="season-primary" to="/ruong-vu">
                      {season ? 'Quản lý ruộng & mùa vụ →' : 'Tạo mùa vụ mới →'}
                    </Link>
                    <Link
                      className="season-secondary"
                      to={
                        season
                          ? '/bai-dang/tao-moi?' +
                            new URLSearchParams({
                              plotId: plot.plotId,
                              cropSeasonId: season.cropSeasonId,
                            })
                          : '/nhat-ky'
                      }
                    >
                      {season ? 'Đăng bán lúa' : 'Ghi nhật ký'}
                    </Link>
                  </div>
                </>
              )}
            </div>
            <figure className="season-hero-art">
              <img
                src={getRiceArtwork(season?.cropType || 'ST25').src}
                alt={getRiceArtwork(season?.cropType || 'ST25').label}
              />
            </figure>
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

        <div className="kpi-grid">
          <section className="dash-card kpi-card">
            <small>Đã ghi chi phí mùa vụ</small>
            <strong className="kpi-value">
              {report.data ? formatVND(Number(report.data.summary.totalCost || 0)) : '—'}
            </strong>
            <Link className="kpi-pill" to="/chi-phi">
              Xem sổ chi phí →
            </Link>
          </section>
          <section className="dash-card kpi-card">
            <small>Bài đăng đang mở bán</small>
            <strong className="kpi-value">
              {myListings.data
                ? `${openListingsCount} / ${myListings.data.totalElements} bài`
                : '—'}
            </strong>
            <Link className="kpi-pill" to="/bai-dang">
              Mở bài đăng →
            </Link>
          </section>
        </div>

        <section className="dash-card">
          <h2>Nhật ký canh tác gần đây</h2>
          {report.isFetching && <p role="status">Đang tải nhật ký mùa vụ…</p>}
          {report.isError && (
            <p role="alert">
              Chưa tải được báo cáo mùa vụ.{' '}
              <button type="button" onClick={() => void report.refetch()}>
                Thử lại
              </button>
            </p>
          )}
          <div className="season-timeline">
            {recentLogs.length > 0 ? (
              recentLogs.map((item) => (
                <article key={item.logId}>
                  <strong>
                    {item.description || workTypeLabels[item.workType] || item.workType}
                  </strong>
                  <small className="tabular-nums">
                    {item.workDate} · {workTypeLabels[item.workType] ?? item.workType} ·{' '}
                    {plot?.name}
                  </small>
                </article>
              ))
            ) : (
              <p>
                {season
                  ? 'Chưa có nhật ký canh tác nào cho mùa vụ này.'
                  : 'Chọn hoặc tạo mùa vụ để bắt đầu ghi nhật ký.'}
              </p>
            )}
          </div>
          <Link to="/nhat-ky">Xem và ghi nhật ký →</Link>
        </section>
      </div>

      <aside className="season-dashboard-aside" aria-label="Thông tin mùa vụ">
        <section className="dash-card">
          <h2>Ruộng đang theo dõi</h2>
          {plots.data && plots.data.items.length > 0 ? (
            <div style={{ display: 'grid', gap: '12px' }}>
              <label className="season-switch">
                Chọn thửa ruộng
                <select
                  value={plot?.plotId ?? ''}
                  onChange={(event) => {
                    sessionStorage.setItem(selectedPlotKey, event.target.value);
                    setSelectedPlotId(event.target.value);
                    setSelectedSeasonId('');
                  }}
                >
                  {plots.data.items.map((item) => (
                    <option key={item.plotId} value={item.plotId}>
                      {item.name} · {item.location}
                    </option>
                  ))}
                </select>
              </label>
              {seasons.data && seasons.data.items.length > 0 && (
                <label className="season-switch">
                  Mùa vụ
                  <select
                    value={season?.cropSeasonId ?? ''}
                    onChange={(event) => setSelectedSeasonId(event.target.value)}
                  >
                    {seasons.data.items.map((item) => (
                      <option key={item.cropSeasonId} value={item.cropSeasonId}>
                        {item.seasonName} ({item.cropType})
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          ) : (
            <p>Chưa có thửa ruộng được lưu trên máy chủ.</p>
          )}
          {report.data && (
            <div className="season-stats-row">
              <div>
                <small>Tổng chi phí</small>
                <strong className="tabular-nums">
                  {formatVND(Number(report.data.summary.totalCost || 0))}
                </strong>
              </div>
              {season?.expectedYield != null && (
                <div>
                  <small>Dự kiến thu</small>
                  <strong className="tabular-nums">
                    {formatYield(Number(season.expectedYield))}
                  </strong>
                </div>
              )}
            </div>
          )}
          <Link to="/ruong-vu">Quản lý danh sách ruộng →</Link>
        </section>

        <section className="dash-card">
          <h2>Giao thương của tôi</h2>
          {myListings.isPending ? (
            <p role="status">Đang tải bài đăng…</p>
          ) : myListings.data ? (
            <p className="tabular-nums">
              <strong>{myListings.data.totalElements}</strong> bài đăng ({openListingsCount} đang mở
              nhận báo giá)
            </p>
          ) : (
            <p>Quản lý bài đăng và báo giá từ thương lái.</p>
          )}
          <div className="season-related">
            <Link to="/bai-dang">
              <UiIcon name="listings" size={16} /> Bài đăng bán lúa →
            </Link>
            <Link to="/bao-gia">
              <UiIcon name="offers" size={16} /> Báo giá đã nhận →
            </Link>
            <Link to="/chi-phi">
              <UiIcon name="costs" size={16} /> Chi phí canh tác →
            </Link>
            <Link to="/payments">
              <UiIcon name="contracts" size={16} /> Hợp đồng &amp; cọc →
            </Link>
          </div>
        </section>
      </aside>
    </div>
  );
}

function DemoFarmerDashboard() {
  const [data] = useState(() => load());
  const [plotId, setPlotId] = useState(() => selectedPlot(data)?.id);
  const plot = data.plots.find((item) => item.id === plotId);
  const logs = data.journal
    .filter((item) => item.plotId === plotId && item.season === plot?.season)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const totalDemoCost = data.costs
    .filter((item) => item.plotId === plotId && item.season === plot?.season)
    .reduce((sum, item) => sum + (item.amount ?? 0), 0);
  const heroArt = getRiceArtwork(plot?.crop || 'ST25');
  return (
    <div className="season-dashboard">
      <div className="season-dashboard-main">
        <header>
          <p className="dash-kicker">BẢNG TIN MÙA VỤ · DEMO CỤC BỘ</p>
          <h1>Hôm nay ruộng lúa thế nào?</h1>
          <p>Dữ liệu minh họa trên trình duyệt, không đồng bộ máy chủ.</p>
        </header>

        <section className="dash-card season-hero">
          <div className="season-hero-grid">
            <div>
              <p className="season-chip">
                <UiIcon name="rice" size={14} /> Mùa vụ minh họa
              </p>
              <h2>
                {plot
                  ? [plot.season || 'Chưa có mùa vụ', plot.name].join(' · ')
                  : 'Ruộng và mùa vụ'}
              </h2>
              {plot && (
                <p className="tabular-nums">{[plot.crop, plot.area].filter(Boolean).join(' · ')}</p>
              )}
              <div className="season-links">
                <Link className="season-primary" to="/ruong-vu">
                  Xem mùa vụ →
                </Link>
                <Link className="season-secondary" to="/nhat-ky">
                  Ghi nhật ký
                </Link>
              </div>
            </div>
            <figure className="season-hero-art">
              <img src={heroArt.src} alt={heroArt.label} />
            </figure>
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

        <div className="kpi-grid">
          <section className="dash-card kpi-card">
            <small>Chi phí minh họa đã ghi</small>
            <strong className="kpi-value">{formatVND(totalDemoCost)}</strong>
            <Link className="kpi-pill" to="/chi-phi">
              Xem chi phí →
            </Link>
          </section>
          <section className="dash-card kpi-card">
            <small>Hoạt động nhật ký</small>
            <strong className="kpi-value">{logs.length} mục</strong>
            <Link className="kpi-pill" to="/nhat-ky">
              Mở nhật ký →
            </Link>
          </section>
        </div>

        <section className="dash-card">
          <h2>Nhật ký canh tác</h2>
          <div className="season-timeline">
            {logs.length ? (
              logs.map((item) => (
                <article key={item.id}>
                  <strong>{item.detail}</strong>
                  <small className="tabular-nums">
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
          <p>{plot?.season || 'Chọn ruộng để xem mùa vụ.'}</p>
          <Link to="/ruong-vu">Xem danh sách ruộng →</Link>
        </section>
        <section className="dash-card">
          <h2>Công việc liên quan</h2>
          <div className="season-related">
            <Link to="/chi-phi">
              <UiIcon name="costs" size={16} /> Chi phí canh tác →
            </Link>
            <Link to="/bai-dang">
              <UiIcon name="listings" size={16} /> Bài đăng bán lúa →
            </Link>
          </div>
        </section>
      </aside>
    </div>
  );
}
