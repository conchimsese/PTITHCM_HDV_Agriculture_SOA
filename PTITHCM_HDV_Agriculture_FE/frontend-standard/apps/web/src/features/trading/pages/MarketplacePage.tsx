import { useState } from 'react';
import type { ListingDTO, ListingStatus } from '@agri/contracts';
import { useSession } from '../../../shared/hooks/useAuth';
import { ListingCard } from '../components/ListingCard';
import { QuickOfferModal } from '../components/QuickOfferModal';
import { LOCATION_PRESETS, useGeolocation, useListings } from '../hooks/useListings';
import './marketplace.css';

export function MarketplacePage() {
  const session = useSession();
  const [page, setPage] = useState(0);
  const [seedTypeFilter, setSeedTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ListingStatus | ''>('OPEN');
  const [selectedListingForOffer, setSelectedListingForOffer] = useState<ListingDTO | null>(null);

  const {
    coords,
    loading: geoLoading,
    error: geoError,
    locationName,
    requestLocation,
    setPresetLocation,
    clearLocation,
  } = useGeolocation();

  const { data, isLoading, isError, error, refetch, isFetching } = useListings({
    page,
    size: 9,
    status: statusFilter ? statusFilter : undefined,
    seedType: seedTypeFilter.trim() || undefined,
    latitude: coords?.latitude,
    longitude: coords?.longitude,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSeedTypeFilter(e.target.value);
    setPage(0);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as ListingStatus | '');
    setPage(0);
  };

  const handlePresetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      clearLocation();
      return;
    }
    const found = LOCATION_PRESETS.find((p) => p.name === val);
    if (found) {
      setPresetLocation(found.name, found.coords);
      setPage(0);
    }
  };

  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  return (
    <div className="marketplace-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Bảng tin bán lúa</h1>
          <p className="page-subtitle">
            Khám phá các sản phẩm lúa chất lượng cao từ nông dân, sắp xếp theo khoảng cách GPS gần
            nhất
          </p>
        </div>
        <div className="header-stats">
          <span className="stats-pill">
            <strong>{totalElements}</strong> bài đăng có sẵn
          </span>
        </div>
      </div>

      {/* Filter and GPS Control Bar */}
      <details className="marketplace-filters-panel">
        <summary>Bộ lọc và vị trí</summary>
        <div className="filters-row">
          {/* Seed Type Keyword Search */}
          <div className="filter-group search-group">
            <label htmlFor="search-seed" className="filter-label">
              Tìm theo giống lúa
            </label>
            <div className="search-input-wrapper">
              <span className="search-icon" aria-hidden="true">
                🔍
              </span>
              <input
                id="search-seed"
                type="text"
                className="filter-input"
                placeholder="Ví dụ: ST25, OM18, Đài Thơm 8, Jasmine…"
                value={seedTypeFilter}
                onChange={handleSearchChange}
              />
              {seedTypeFilter && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => {
                    setSeedTypeFilter('');
                    setPage(0);
                  }}
                  aria-label="Xóa từ khóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="filter-group status-group">
            <label htmlFor="filter-status" className="filter-label">
              Trạng thái
            </label>
            <select
              id="filter-status"
              className="filter-select"
              value={statusFilter}
              onChange={handleStatusChange}
            >
              <option value="OPEN">Đang mở (OPEN)</option>
              <option value="">Tất cả trạng thái</option>
              <option value="LOCKED">Đã cọc (LOCKED)</option>
              <option value="SOLD">Đã bán (SOLD)</option>
            </select>
          </div>

          {/* Location / GPS Proximity Controls */}
          <div className="filter-group gps-group">
            <label htmlFor="preset-location" className="filter-label">
              Vị trí sắp xếp (GPS)
            </label>
            <div className="gps-controls">
              <button
                type="button"
                className={`gps-btn ${coords && locationName?.includes('hiện tại') ? 'active' : ''}`}
                onClick={requestLocation}
                disabled={geoLoading}
                title="Sử dụng tọa độ GPS của thiết bị để tìm lúa gần bạn nhất"
              >
                {geoLoading ? '📍 Đang định vị…' : '📍 Vị trí của tôi'}
              </button>

              <select
                id="preset-location"
                className="filter-select preset-select"
                value={locationName && !locationName.includes('hiện tại') ? locationName : ''}
                onChange={handlePresetSelect}
              >
                <option value="">Chọn khu vực mẫu…</option>
                {LOCATION_PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Location Status Banner */}
        {coords && (
          <div className="location-active-banner">
            <span className="banner-icon" aria-hidden="true">
              🧭
            </span>
            <span>
              Đang ưu tiên sản phẩm gần:{' '}
              <strong>
                {locationName} ({coords.latitude.toFixed(3)}, {coords.longitude.toFixed(3)})
              </strong>
            </span>
            <button type="button" className="banner-clear-btn" onClick={clearLocation}>
              Hủy sắp xếp khoảng cách
            </button>
          </div>
        )}

        {geoError && (
          <div className="location-error-banner" role="alert">
            <span>⚠️ {geoError}</span>
            <span className="error-hint">
              Bạn có thể chọn một trong các khu vực mẫu ở thanh bên trên.
            </span>
          </div>
        )}
      </details>

      {/* Main Content Area: Loading, Error, Empty, or Cards Grid */}
      {isLoading ? (
        <div className="listings-skeleton-grid" aria-busy="true" aria-label="Đang tải dữ liệu">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="skeleton-card" />
          ))}
        </div>
      ) : isError ? (
        <div className="error-panel" role="alert">
          <span className="error-icon" aria-hidden="true">
            ⚠️
          </span>
          <h3>Không thể tải danh sách sản phẩm</h3>
          <p>{error?.message || 'Có lỗi kết nối máy chủ. Vui lòng thử lại.'}</p>
          <button type="button" className="retry-btn" onClick={() => void refetch()}>
            Thử lại
          </button>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="empty-panel">
          <span className="empty-icon" aria-hidden="true">
            🌾
          </span>
          <h3>Không tìm thấy bài đăng nào phù hợp</h3>
          <p>Hãy thử thay đổi từ khóa tìm kiếm hoặc chọn tất cả trạng thái để xem thêm kết quả.</p>
          <button
            type="button"
            className="reset-filters-btn"
            onClick={() => {
              setSeedTypeFilter('');
              setStatusFilter('OPEN');
              clearLocation();
              setPage(0);
            }}
          >
            Đặt lại tất cả bộ lọc
          </button>
        </div>
      ) : (
        <>
          <div className={`listings-grid ${isFetching ? 'fetching' : ''}`}>
            {data.items.map((listing) => (
              <ListingCard
                key={listing.listingId}
                listing={listing}
                userCoords={coords}
                currentUserId={session?.accountId}
                onMakeOffer={session?.role === 'TRADER' ? setSelectedListingForOffer : undefined}
              />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <nav className="pagination-bar" aria-label="Phân trang">
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
        </>
      )}

      {/* Quick Offer Submission Modal */}
      <QuickOfferModal
        listing={selectedListingForOffer}
        isOpen={Boolean(selectedListingForOffer)}
        onClose={() => setSelectedListingForOffer(null)}
      />
    </div>
  );
}
