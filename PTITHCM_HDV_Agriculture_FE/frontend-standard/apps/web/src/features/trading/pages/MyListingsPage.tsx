import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ListingStatus } from '@agri/contracts';
import { useSession } from '../../../shared/hooks/useAuth';
import { formatArea, formatVND, formatYield } from '../../../shared/utils/formatters';
import { useListings } from '../hooks/useListings';
import './trading.css';

export function MyListingsPage() {
  const session = useSession();
  const [statusFilter, setStatusFilter] = useState<ListingStatus | ''>('');
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, error, refetch, isFetching } = useListings({
    farmerId: session?.accountId,
    status: statusFilter ? statusFilter : undefined,
    page,
    size: 10,
  });

  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  // Calculate quick totals for summary banner
  const allListings = data?.items ?? [];
  const totalYieldKg = allListings.reduce((sum, item) => sum + item.estimatedYield, 0);
  const openCount = allListings.filter((i) => i.status === 'OPEN').length;

  const statusTabList: { id: ListingStatus | ''; label: string }[] = [
    { id: '', label: 'Tất cả bài đăng' },
    { id: 'OPEN', label: 'Đang mở (OPEN)' },
    { id: 'LOCKED', label: 'Đã nhận cọc (LOCKED)' },
    { id: 'SOLD', label: 'Đã hoàn tất (SOLD)' },
  ];

  return (
    <div className="trading-page my-listings-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Bài đăng của tôi</h1>
          <p className="page-subtitle">
            Theo dõi và quản lý các sản phẩm lúa bạn đang chào bán trên sàn giao dịch
          </p>
        </div>
        <Link to="/bai-dang/tao-moi" className="header-action-btn primary">
          + Đăng bài bán lúa mới
        </Link>
      </div>

      {/* Summary Metrics Bar */}
      <div className="farmer-metrics-row">
        <div className="metric-card">
          <span className="metric-icon" aria-hidden="true">
            🌾
          </span>
          <div className="metric-content">
            <span className="metric-label">Tổng bài đăng</span>
            <span className="metric-value">{totalElements}</span>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-icon" aria-hidden="true">
            ⚖️
          </span>
          <div className="metric-content">
            <span className="metric-label">Tổng sản lượng</span>
            <span className="metric-value">{formatYield(totalYieldKg)}</span>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-icon" aria-hidden="true">
            📢
          </span>
          <div className="metric-content">
            <span className="metric-label">Đang mở nhận báo giá</span>
            <span className="metric-value open">{openCount}</span>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="status-tabs-row" role="tablist" aria-label="Bộ lọc trạng thái">
        {statusTabList.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={statusFilter === tab.id}
            className={`status-tab ${statusFilter === tab.id ? 'active' : ''}`}
            onClick={() => {
              setStatusFilter(tab.id);
              setPage(0);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content: Loading, Error, Empty, or Table */}
      {isLoading ? (
        <div className="table-skeleton-container" aria-busy="true">
          {[1, 2, 3].map((n) => (
            <div key={n} className="table-skeleton-row" />
          ))}
        </div>
      ) : isError ? (
        <div className="error-panel" role="alert">
          <span className="error-icon" aria-hidden="true">
            ⚠️
          </span>
          <h3>Không thể tải danh sách bài đăng</h3>
          <p>{error?.message || 'Có lỗi kết nối máy chủ.'}</p>
          <button type="button" className="retry-btn" onClick={() => void refetch()}>
            Thử lại
          </button>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="empty-panel">
          <span className="empty-icon" aria-hidden="true">
            🌾
          </span>
          <h3>Bạn chưa có bài đăng nào {statusFilter ? `ở trạng thái ${statusFilter}` : ''}</h3>
          <p>Đăng bài bán lúa để kết nối với các thương lái gần bạn và nhận báo giá thu mua.</p>
          <Link to="/bai-dang/tao-moi" className="primary-button" style={{ marginTop: '12px' }}>
            + Đăng bài bán lúa ngay
          </Link>
        </div>
      ) : (
        <div className={`table-container ${isFetching ? 'fetching' : ''}`}>
          <table className="listings-table">
            <thead>
              <tr>
                <th>Giống lúa</th>
                <th>Giá mong muốn</th>
                <th>Sản lượng</th>
                <th>Diện tích</th>
                <th>Trạng thái</th>
                <th>Tọa độ</th>
                <th className="align-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const statusMap = {
                  OPEN: { label: 'Đang mở (OPEN)', className: 'status-open' },
                  LOCKED: { label: 'Đã nhận cọc (LOCKED)', className: 'status-locked' },
                  SOLD: { label: 'Đã bán (SOLD)', className: 'status-sold' },
                };
                const s = statusMap[item.status] || {
                  label: item.status,
                  className: '',
                };

                return (
                  <tr key={item.listingId}>
                    <td>
                      <div className="table-produce-cell">
                        <span className="rice-cell-icon" aria-hidden="true">
                          🌾
                        </span>
                        <div>
                          <strong>{item.seedType}</strong>
                          <span className="cell-subtext">ID: {item.listingId.slice(0, 8)}…</span>
                        </div>
                      </div>
                    </td>
                    <td className="price-cell">{formatVND(item.expectedPrice)}</td>
                    <td>{formatYield(item.estimatedYield)}</td>
                    <td>{formatArea(item.area)}</td>
                    <td>
                      <span className={`status-pill ${s.className}`}>{s.label}</span>
                    </td>
                    <td className="coords-cell">
                      {item.latitude.toFixed(3)}, {item.longitude.toFixed(3)}
                    </td>
                    <td className="align-right">
                      <div className="table-actions">
                        <Link to={`/bai-dang/${item.listingId}`} className="table-btn view">
                          Chi tiết
                        </Link>
                        <Link
                          to={`/bai-dang/${item.listingId}/bao-gia`}
                          className="table-btn offers"
                        >
                          Báo giá
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="pagination-bar" aria-label="Phân trang danh sách bài đăng">
              <button
                type="button"
                className="page-nav-btn"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ← Trang trước
              </button>
              <span className="page-indicator">
                Trang <strong>{page + 1}</strong> / {totalPages}
              </span>
              <button
                type="button"
                className="page-nav-btn"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Trang sau →
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
