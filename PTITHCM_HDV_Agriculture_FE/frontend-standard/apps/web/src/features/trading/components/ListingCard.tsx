import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ListingDTO } from '@agri/contracts';
import { UiIcon } from '../../../shared/ui/UiIcon';
import { getRiceArtwork } from '../utils/riceArtwork';
import {
  formatArea,
  formatDistance,
  formatVND,
  formatYield,
} from '../../../shared/utils/formatters';

interface ListingCardProps {
  listing: ListingDTO;
  userCoords?: { latitude: number; longitude: number } | null;
  currentUserId?: string;
  onMakeOffer?: (listing: ListingDTO) => void;
}

const radians = (n: number) => (n * Math.PI) / 180;
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const a =
    Math.sin(radians(lat2 - lat1) / 2) ** 2 +
    Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

export function ListingCard({ listing, userCoords, currentUserId, onMakeOffer }: ListingCardProps) {
  const distanceKm = userCoords
    ? haversineDistance(
        userCoords.latitude,
        userCoords.longitude,
        listing.latitude,
        listing.longitude,
      )
    : undefined;

  const isOwner = currentUserId && listing.farmerId === currentUserId;
  const isAvailable = listing.status === 'OPEN';

  const statusMap = {
    OPEN: { label: 'Đang mở nhận báo giá', className: 'status-open' },
    LOCKED: { label: 'Đã nhận cọc', className: 'status-locked' },
    SOLD: { label: 'Đã hoàn tất bán', className: 'status-sold' },
  };

  const currentStatus = statusMap[listing.status] || {
    label: listing.status,
    className: '',
  };

  const [imageBroken, setImageBroken] = useState(false);
  const artwork = getRiceArtwork(listing.seedType);
  const hasUploadedImage = Boolean(listing.images?.length) && !imageBroken;

  return (
    <article className="listing-card">
      <div className="card-top">
        <div className="produce-header">
          <span className="rice-icon" aria-hidden="true">
            <UiIcon name="rice" size={20} />
          </span>
          <div>
            <h3 className="produce-title">{listing.seedType}</h3>
            <span className="farmer-ref">Nông dân: {listing.farmerId.slice(0, 8)}…</span>
          </div>
        </div>
        <span className={`status-pill ${currentStatus.className}`}>{currentStatus.label}</span>
      </div>

      {hasUploadedImage ? (
        <div className="card-produce-media">
          <img
            src={listing.images[0]}
            alt={listing.seedType}
            className="card-produce-img"
            onError={() => setImageBroken(true)}
          />
          {listing.images.length > 1 && (
            <span className="card-photo-count">
              <UiIcon name="camera" size={14} /> {listing.images.length} ảnh
            </span>
          )}
        </div>
      ) : (
        <figure className="feed-illustration">
          <img src={artwork.src} alt="" />
          <figcaption>{artwork.label}</figcaption>
        </figure>
      )}
      <div className="card-price-section">
        <span className="price-label">Giá mong muốn:</span>
        <span className="price-value">{formatVND(listing.expectedPrice)}</span>
      </div>

      <div className="card-specs-grid">
        <div className="spec-item">
          <span className="spec-label">Sản lượng dự kiến</span>
          <span className="spec-value">{formatYield(listing.estimatedYield)}</span>
        </div>
        <div className="spec-item">
          <span className="spec-label">Diện tích</span>
          <span className="spec-value">{formatArea(listing.area)}</span>
        </div>
        <div className="spec-item">
          <span className="spec-label">Khoảng cách</span>
          <span className="spec-value">
            {distanceKm !== undefined ? formatDistance(distanceKm) : 'Chưa định vị'}
          </span>
        </div>
        <div className="spec-item">
          <span className="spec-label">Tọa độ ruộng</span>
          <span
            className="spec-value coordinates"
            title={`${listing.latitude}, ${listing.longitude}`}
          >
            {listing.latitude.toFixed(3)}, {listing.longitude.toFixed(3)}
          </span>
        </div>
      </div>

      <div className="card-actions">
        <Link to={`/bai-dang/${listing.listingId}`} className="card-btn secondary">
          Xem chi tiết
        </Link>

        {onMakeOffer && (
          <button
            type="button"
            className="card-btn primary"
            onClick={() => onMakeOffer(listing)}
            disabled={!isAvailable || Boolean(isOwner)}
            title={
              isOwner
                ? 'Không thể gửi báo giá cho bài đăng của chính mình'
                : !isAvailable
                  ? 'Bài đăng không còn mở nhận báo giá'
                  : 'Gửi đề xuất thu mua tới nông dân'
            }
          >
            {isOwner ? 'Bài của bạn' : !isAvailable ? 'Không khả dụng' : 'Gửi báo giá'}
          </button>
        )}
      </div>
    </article>
  );
}
