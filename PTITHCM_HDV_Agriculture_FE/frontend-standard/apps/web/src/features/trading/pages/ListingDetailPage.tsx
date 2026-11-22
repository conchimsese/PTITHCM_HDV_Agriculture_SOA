import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSession } from '../../../shared/hooks/useAuth';
import { formatArea, formatVND, formatYield } from '../../../shared/utils/formatters';
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
            ⚠️
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
      label: 'Đang mở nhận báo giá (OPEN)',
      desc: 'Nông dân đang mở nhận đề xuất thu mua từ các thương lái.',
      className: 'status-open',
    },
    LOCKED: {
      label: 'Đã nhận cọc độc quyền (LOCKED)',
      desc: 'Một thương lái đã nạp 5% tiền cọc cam kết thành công. Bài đăng tạm khóa.',
      className: 'status-locked',
    },
    SOLD: {
      label: 'Đã hoàn tất bán (SOLD)',
      desc: 'Hợp đồng đã hoàn thành nghiệm thu và bàn giao lúa thành công.',
      className: 'status-sold',
    },
  };

  const statusInfo = statusMap[listing.status] || {
    label: listing.status,
    desc: '',
    className: '',
  };

  // Yield per hectare metric
  const yieldPerHa =
    listing.area > 0 ? ((listing.estimatedYield / listing.area) * 10000) / 1000 : 0;

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
          ✓ Đăng bài bán lúa thành công! Sản phẩm hiện đã sẵn sàng trên sàn thị trường để thương lái
          gửi báo giá.
        </div>
      )}

      {/* Produce Main Card */}
      <div className="listing-detail-card">
        <div className="detail-header">
          <div className="detail-title-group">
            <span className="detail-rice-icon" aria-hidden="true">
              🌾
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

        {/* Produce Photos Gallery */}
        {listing.images && listing.images.length > 0 && (
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
        )}

        {/* Price & Primary CTA Banner */}
        <div className="detail-price-banner">
          <div className="price-block">
            <span className="price-tag-label">Giá kỳ vọng (toàn bộ sản lượng)</span>
            <span className="price-tag-value">{formatVND(listing.expectedPrice)}</span>
          </div>

          <div className="cta-block">
            {isOwner ? (
              <div className="owner-cta-group">
                <Link
                  to={`/bai-dang/${listing.listingId}/bao-gia`}
                  className="primary-button cta-btn"
                >
                  🏷️ Xem báo giá đã nhận
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
                    📝 Gửi báo giá thu mua ngay
                  </button>
                ) : (
                  <button type="button" className="primary-button cta-btn" disabled>
                    {listing.status === 'LOCKED'
                      ? '🔒 Đã nhận cọc đặt chỗ'
                      : '✓ Giao dịch đã hoàn tất'}
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
              🌾
            </span>
            <div className="spec-card-text">
              <span className="spec-card-label">Giống lúa canh tác</span>
              <span className="spec-card-value">{listing.seedType}</span>
            </div>
          </div>

          <div className="spec-card">
            <span className="spec-card-icon" aria-hidden="true">
              ⚖️
            </span>
            <div className="spec-card-text">
              <span className="spec-card-label">Sản lượng dự kiến</span>
              <span className="spec-card-value">{formatYield(listing.estimatedYield)}</span>
            </div>
          </div>

          <div className="spec-card">
            <span className="spec-card-icon" aria-hidden="true">
              📐
            </span>
            <div className="spec-card-text">
              <span className="spec-card-label">Diện tích canh tác</span>
              <span className="spec-card-value">{formatArea(listing.area)}</span>
            </div>
          </div>

          <div className="spec-card">
            <span className="spec-card-icon" aria-hidden="true">
              📊
            </span>
            <div className="spec-card-text">
              <span className="spec-card-label">Năng suất ước tính</span>
              <span className="spec-card-value">{yieldPerHa.toFixed(1)} tấn/ha</span>
            </div>
          </div>

          <div className="spec-card">
            <span className="spec-card-icon" aria-hidden="true">
              📍
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
              👤
            </span>
            <div className="spec-card-text">
              <span className="spec-card-label">Chủ thửa ruộng (Nông dân)</span>
              <span className="spec-card-value monospace">
                {isOwner ? 'Chính bạn (Tài khoản của bạn)' : `${listing.farmerId.slice(0, 8)}…`}
              </span>
            </div>
          </div>
        </div>

        {/* References Snapshot Info */}
        <div className="technical-snapshot-box">
          <h4>Thông tin liên kết hệ thống (Snapshot)</h4>
          <p className="snapshot-desc">
            Dữ liệu giống, năng suất và tọa độ được Trading Service chụp snapshot tự động từ Farming
            Service khi tạo bài đăng.
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
        </div>
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
