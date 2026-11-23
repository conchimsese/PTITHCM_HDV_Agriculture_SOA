import { useState } from 'react';
import { getRiceArtwork } from '../utils/riceArtwork';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSession } from '../../../shared/hooks/useAuth';
import { UiIcon } from '../../../shared/ui/UiIcon';
import {
  formatArea,
  formatPricePerKg,
  formatVND,
  formatYield,
} from '../../../shared/utils/formatters';
import { QuickOfferModal } from '../components/QuickOfferModal';
import { useListingDetail } from '../hooks/useListingDetail';
import './trading.css';

export function ListingDetailPage() {
  const { listingId } = useParams<{ listingId: string }>();
  const location = useLocation();
  const session = useSession();
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const { data: listing, isLoading, isError, error, refetch } = useListingDetail(listingId);

  const isOwner = session && listing && listing.farmerId === session.accountId;
  const isTrader = session?.role === 'TRADER';
  const wasJustCreated = Boolean(location.state?.createdSuccess);

  if (isLoading) {
    return (
      <div className="trading-page listing-detail-page">
        <div className="detail-skeleton" aria-busy="true">
          <div className="skeleton-line title" />
          <div className="skeleton-line subtitle" />
          <div className="skeleton-box" />
        </div>
      </div>
    );
  }

  if (isError || !listing) {
    return (
      <div className="trading-page listing-detail-page">
        <div className="error-panel" role="alert">
          <span className="error-icon" aria-hidden="true">
            <UiIcon name="disputes" size={24} />
          </span>
          <h3>Không tìm thấy bài đăng</h3>
          <p>{error?.message || 'Bài đăng không tồn tại hoặc đã bị xóa.'}</p>
          <div className="panel-actions">
            <Link
              to={session?.role === 'FARMER' ? '/bai-dang' : '/thi-truong'}
              className="primary-button"
            >
              ← Quay lại danh sách
            </Link>
            <button type="button" className="secondary-button" onClick={() => void refetch()}>
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusMap = {
    OPEN: {
      label: 'Đang mở nhận báo giá',
      desc: 'Nông dân đang mở nhận đề xuất thu mua từ các thương lái.',
      className: 'status-open',
    },
    LOCKED: {
      label: 'Đã nhận cọc giữ chỗ',
      desc: 'Một thương lái đã nạp 5% tiền cọc cam kết thành công. Bài đăng tạm khóa.',
      className: 'status-locked',
    },
    SOLD: {
      label: 'Đã hoàn tất bán',
      desc: 'Hợp đồng đã hoàn thành nghiệm thu và bàn giao lúa thành công.',
      className: 'status-sold',
    },
  };

  const statusInfo = statusMap[listing.status] || {
    label: listing.status,
    desc: '',
    className: '',
  };

  // Yield per hectare metric & price per kg estimate
  const yieldPerHa =
    listing.area > 0 ? ((listing.estimatedYield / listing.area) * 10000) / 1000 : 0;
  const pricePerKg = formatPricePerKg(listing.expectedPrice, listing.estimatedYield);

  return (
    <div className="trading-page listing-detail-page">
      {/* Breadcrumbs */}
      <nav className="breadcrumb-nav" aria-label="Đường dẫn">
        <Link to={isOwner ? '/bai-dang' : '/thi-truong'}>
          {isOwner ? 'Bài đăng của tôi' : 'Thị trường'}
        </Link>
        <span aria-hidden="true">/</span>
        <span>Chi tiết sản phẩm ({listing.listingId.slice(0, 8)}…)</span>
      </nav>

      {/* Just Created Success Alert */}
      {wasJustCreated && (
        <div className="alert alert-success" role="status">
          <UiIcon name="check" size={16} /> Đăng bài bán lúa thành công! Sản phẩm hiện đã sẵn sàng
          trên sàn thị trường để thương lái gửi báo giá.
        </div>
      )}

      {/* Produce Main Card */}
      <div className="listing-detail-card">
        <div className="detail-header">
          <div className="detail-title-group">
            <span className="detail-rice-icon" aria-hidden="true">
              <UiIcon name="rice" size={24} />
            </span>
            <div>
              <h1>{listing.seedType}</h1>
              <span className="detail-id">Mã bài đăng: {listing.listingId}</span>
            </div>
          </div>
          <div className="detail-status-pill-group">
            <span className={`status-pill large ${statusInfo.className}`}>{statusInfo.label}</span>
          </div>
        </div>

        {/* Produce Photos Gallery or V5 Variety Illustration */}
        {listing.images && listing.images.length > 0 ? (
          <div className="detail-gallery">
            <div className="gallery-main-view">
              <img
                src={listing.images[activeImageIndex] || listing.images[0]}
                alt={`${listing.seedType} - Ảnh ${activeImageIndex + 1}`}
                className="gallery-main-img"
              />
              <span className="gallery-badge">
                Ảnh {activeImageIndex + 1} / {listing.images.length}
              </span>
            </div>

            {listing.images.length > 1 && (
              <div className="gallery-thumbnails-strip">
                {listing.images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`gallery-thumb-btn ${idx === activeImageIndex ? 'active' : ''}`}
                    onClick={() => setActiveImageIndex(idx)}
                    title={`Xem ảnh ${idx + 1}`}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="gallery-thumb-img" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <figure className="feed-illustration" style={{ marginBottom: '20px' }}>
            <img src={getRiceArtwork(listing.seedType).src} alt={listing.seedType} />
            <figcaption>{getRiceArtwork(listing.seedType).label}</figcaption>
          </figure>
        )}

        {/* Price & Primary CTA Banner */}
        <div className="detail-price-banner">
          <div className="price-block">
            <span className="price-tag-label">Giá kỳ vọng (toàn bộ sản lượng)</span>
            <span className="price-tag-value tabular-nums">{formatVND(listing.expectedPrice)}</span>
            {pricePerKg && (
              <span className="detail-price-per-kg tabular-nums">
                Đơn giá ước tính: {pricePerKg}
              </span>
            )}
          </div>

          <div className="cta-block">
            {isOwner ? (
              <div className="owner-cta-group">
                <Link
                  to={`/bai-dang/${listing.listingId}/bao-gia`}
                  className="primary-button cta-btn"
                >
                  <UiIcon name="offers" size={17} /> Xem báo giá đã nhận
                </Link>
                <Link to="/bai-dang" className="secondary-button cta-btn">
                  Quản lý bài đăng
                </Link>
              </div>
            ) : isTrader ? (
              <div className="trader-cta-group">
                {listing.status === 'OPEN' ? (
                  <button
                    type="button"
                    className="primary-button cta-btn"
                    onClick={() => setOfferModalOpen(true)}
                  >
                    <UiIcon name="edit" size={17} /> Gửi báo giá thu mua ngay
                  </button>
                ) : (
                  <button type="button" className="primary-button cta-btn" disabled>
                    <UiIcon name={listing.status === 'LOCKED' ? 'lock' : 'check'} size={17} />{' '}
                    {listing.status === 'LOCKED' ? 'Đã nhận cọc đặt chỗ' : 'Giao dịch đã hoàn tất'}
                  </button>
                )}
                <Link to="/thi-truong" className="secondary-button cta-btn">
                  Xem thêm sản phẩm khác
                </Link>
              </div>
            ) : (
              <Link to="/thi-truong" className="secondary-button cta-btn">
                ← Quay lại thị trường
              </Link>
            )}
          </div>
        </div>

        {/* Specifications Grid */}
        <h3 className="section-title">Thông số mùa vụ canh tác</h3>
        <div className="specs-details-grid">
          <div className="spec-card">
            <span className="spec-card-icon" aria-hidden="true">
              <UiIcon name="rice" size={20} />
            </span>
            <div className="spec-card-text">
              <span className="spec-card-label">Giống lúa canh tác</span>
              <span className="spec-card-value">{listing.seedType}</span>
            </div>
          </div>

          <div className="spec-card">
            <span className="spec-card-icon" aria-hidden="true">
              <UiIcon name="scale" size={20} />
            </span>
            <div className="spec-card-text">
              <span className="spec-card-label">Sản lượng dự kiến</span>
              <span className="spec-card-value">{formatYield(listing.estimatedYield)}</span>
            </div>
          </div>

          <div className="spec-card">
            <span className="spec-card-icon" aria-hidden="true">
              <UiIcon name="area" size={20} />
            </span>
            <div className="spec-card-text">
              <span className="spec-card-label">Diện tích canh tác</span>
              <span className="spec-card-value">{formatArea(listing.area)}</span>
            </div>
          </div>

          <div className="spec-card">
            <span className="spec-card-icon" aria-hidden="true">
              <UiIcon name="chart" size={20} />
            </span>
            <div className="spec-card-text">
              <span className="spec-card-label">Năng suất ước tính</span>
              <span className="spec-card-value">{yieldPerHa.toFixed(1)} tấn/ha</span>
            </div>
          </div>

          <div className="spec-card">
            <span className="spec-card-icon" aria-hidden="true">
              <UiIcon name="pin" size={20} />
            </span>
            <div className="spec-card-text">
              <span className="spec-card-label">Tọa độ GPS ruộng</span>
              <span className="spec-card-value monospace">
                {listing.latitude.toFixed(6)}, {listing.longitude.toFixed(6)}
              </span>
            </div>
          </div>

          <div className="spec-card">
            <span className="spec-card-icon" aria-hidden="true">
              <UiIcon name="user" size={20} />
            </span>
            <div className="spec-card-text">
              <span className="spec-card-label">Chủ thửa ruộng (Nông dân)</span>
              <span className="spec-card-value">
                {isOwner
                  ? 'Chính bạn (Tài khoản của bạn)'
                  : `Nhà nông xác thực · #${listing.farmerId.slice(-4).toUpperCase()}`}
              </span>
            </div>
          </div>
        </div>

        {/* Collapsible Technical Reference (Progressive Disclosure) */}
        <details className="technical-snapshot-box">
          <summary
            style={{
              cursor: 'pointer',
              fontWeight: 650,
              color: '#164735',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            Thông tin đối chiếu mã ruộng &amp; mùa vụ (kỹ thuật)
          </summary>
          <p className="snapshot-desc" style={{ marginTop: '8px' }}>
            Thông tin giống lúa, sản lượng dự kiến và tọa độ được lưu cố định theo thửa ruộng tại
            thời điểm nông dân đăng bán.
          </p>
          <div className="snapshot-ids-row">
            <div className="id-tag">
              <span>Mã thửa ruộng (plotId):</span>
              <code>{listing.plotId}</code>
            </div>
            <div className="id-tag">
              <span>Mã mùa vụ (cropSeasonId):</span>
              <code>{listing.cropSeasonId}</code>
            </div>
          </div>
        </details>
      </div>

      {/* Offer Submission Modal for Traders */}
      <QuickOfferModal
        listing={listing}
        isOpen={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
      />
    </div>
  );
}
