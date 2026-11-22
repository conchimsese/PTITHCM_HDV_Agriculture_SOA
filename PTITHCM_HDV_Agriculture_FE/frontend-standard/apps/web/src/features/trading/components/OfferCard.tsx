import { Link } from 'react-router-dom';
import type { OfferDTO } from '@agri/contracts';
import { UiIcon } from '../../../shared/ui/UiIcon';
import { formatDate, formatVND } from '../../../shared/utils/formatters';

interface OfferCardProps {
  offer: OfferDTO;
  isFarmerView?: boolean;
  onAccept?: (offer: OfferDTO) => void;
  onReject?: (offer: OfferDTO) => void;
  onCancel?: (offer: OfferDTO) => void;
  isAccepting?: boolean;
  isRejecting?: boolean;
  isCancelling?: boolean;
}

export function OfferCard({
  offer,
  isFarmerView = false,
  onAccept,
  onReject,
  onCancel,
  isAccepting = false,
  isRejecting = false,
  isCancelling = false,
}: OfferCardProps) {
  const isAccepted = offer.status === 'ACCEPTED';
  const isPending = offer.status === 'PENDING';
  const isRejected = offer.status === 'REJECTED';
  const isCancelled = offer.status === 'CANCELLED';
  const chatUrl = `/chat?offerId=${offer.offerId}`;

  const statusLabel = {
    PENDING: { label: 'Đang chờ duyệt (PENDING)', className: 'status-pending' },
    ACCEPTED: { label: 'Đã chấp nhận (ACCEPTED)', className: 'status-open' },
    REJECTED: { label: 'Đã từ chối (REJECTED)', className: 'status-rejected' },
    CANCELLED: { label: 'Đã hủy bỏ (CANCELLED)', className: 'status-cancelled' },
  }[offer.status] || { label: offer.status, className: '' };

  return (
    <article className={`offer-card ${offer.status.toLowerCase()}`}>
      <div className="offer-card-top">
        <div className="offer-entity-header">
          <span className="offer-type-icon" aria-hidden="true">
            <UiIcon
              name={isAccepted ? 'check' : isRejected ? 'ban' : isCancelled ? 'undo' : 'offers'}
              size={18}
            />
          </span>
          <div>
            <h4 className="offer-title">
              {isFarmerView ? 'Báo giá từ Thương lái' : 'Báo giá thu mua'}
            </h4>
            <span className="offer-counterpart-id">
              {isFarmerView
                ? `Thương lái: ${offer.traderId.slice(0, 8)}…`
                : `Nông dân: ${offer.farmerId.slice(0, 8)}…`}
            </span>
          </div>
        </div>

        <span className={`status-pill ${statusLabel.className}`}>{statusLabel.label}</span>
      </div>

      {/* Offered Price Highlight Block */}
      <div className="offer-price-highlight-banner">
        <div className="price-tag-group">
          <span className="highlight-label">Giá đề xuất thu mua:</span>
          <span className="highlight-price">{formatVND(offer.offeredPrice)}</span>
        </div>
        <div className="deposit-tag-group">
          <span className="highlight-label">Tiền cọc cam kết (5%):</span>
          <span className="highlight-deposit">{formatVND(offer.depositAmount)}</span>
        </div>
      </div>

      <div className="offer-meta-grid">
        <div className="meta-item">
          <span className="meta-label">Mã báo giá:</span>
          <code className="meta-value">{offer.offerId.slice(0, 8)}…</code>
        </div>
        <div className="meta-item">
          <span className="meta-label">Bài đăng lúa:</span>
          <Link to={`/bai-dang/${offer.listingId}`} className="meta-link">
            Xem sản phẩm →
          </Link>
        </div>
        <div className="meta-item">
          <span className="meta-label">Thời gian gửi:</span>
          <span className="meta-value">{formatDate(offer.createdAt)}</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Cập nhật:</span>
          <span className="meta-value">{formatDate(offer.updatedAt)}</span>
        </div>
      </div>

      {isAccepted && (
        <div className="offer-accepted-banner">
          <span className="banner-icon" aria-hidden="true">
            <UiIcon name="sparkle" size={18} />
          </span>
          <span>
            {isFarmerView
              ? 'Bạn đã chấp nhận đề xuất này! Hai bên có thể thảo luận trực tiếp qua Chat.'
              : 'Nông dân đã chấp nhận đề xuất thu mua của bạn! Hãy mở Chat để đàm phán hợp đồng.'}
          </span>
        </div>
      )}

      {isRejected && (
        <div className="offer-status-alert rejected">
          <span>
            {isFarmerView
              ? 'Bạn đã từ chối báo giá này. Thương lái có thể gửi lại mức giá khác phù hợp hơn.'
              : 'Nông dân đã từ chối mức giá này. Bạn có thể gửi lại báo giá mới với mức giá cạnh tranh hơn.'}
          </span>
        </div>
      )}

      {isCancelled && (
        <div className="offer-status-alert cancelled">
          <span>
            {isFarmerView
              ? 'Thương lái đã rút lại báo giá này.'
              : 'Bạn đã chủ động hủy báo giá này. Bạn có thể gửi lại báo giá mới bất cứ lúc nào.'}
          </span>
        </div>
      )}

      <div className="offer-actions">
        {isFarmerView ? (
          <>
            {isPending && (
              <>
                {onAccept && (
                  <button
                    type="button"
                    className="offer-btn primary"
                    disabled={isAccepting || isRejecting}
                    onClick={() => onAccept(offer)}
                  >
                    {isAccepting ? (
                      'Đang xác nhận…'
                    ) : (
                      <>
                        <UiIcon name="check" size={16} /> Đồng ý báo giá
                      </>
                    )}
                  </button>
                )}
                {onReject && (
                  <button
                    type="button"
                    className="offer-btn reject-btn"
                    disabled={isAccepting || isRejecting}
                    onClick={() => onReject(offer)}
                  >
                    {isRejecting ? (
                      'Đang từ chối…'
                    ) : (
                      <>
                        <UiIcon name="close" size={16} /> Từ chối
                      </>
                    )}
                  </button>
                )}
              </>
            )}
            {isAccepted && (
              <Link to={chatUrl} className="offer-btn chat-btn">
                <UiIcon name="chat" size={16} /> Mở phòng Chat thương lượng →
              </Link>
            )}
            <Link to={`/bai-dang/${offer.listingId}`} className="offer-btn secondary">
              Xem chi tiết bài đăng
            </Link>
          </>
        ) : (
          <>
            {isAccepted && (
              <Link to={chatUrl} className="offer-btn chat-btn">
                <UiIcon name="chat" size={16} /> Vào phòng Chat trao đổi ngay →
              </Link>
            )}
            {isPending && (
              <>
                <span className="offer-waiting-text">
                  <UiIcon name="clock" size={15} /> Đang chờ nông dân phản hồi đề xuất của bạn
                </span>
                {onCancel && (
                  <button
                    type="button"
                    className="offer-btn cancel-btn"
                    disabled={isCancelling}
                    onClick={() => onCancel(offer)}
                  >
                    {isCancelling ? (
                      'Đang rút lại…'
                    ) : (
                      <>
                        <UiIcon name="undo" size={15} /> Rút lại báo giá
                      </>
                    )}
                  </button>
                )}
              </>
            )}
            {(isRejected || isCancelled) && (
              <Link to={`/bai-dang/${offer.listingId}`} className="offer-btn primary reoffer-btn">
                <UiIcon name="edit" size={16} /> Trả giá lại cho bài đăng này →
              </Link>
            )}
            <Link to={`/bai-dang/${offer.listingId}`} className="offer-btn secondary">
              Xem bài đăng lúa
            </Link>
          </>
        )}
      </div>
    </article>
  );
}
