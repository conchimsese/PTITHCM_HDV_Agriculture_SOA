import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { OfferDTO, OfferStatus } from '@agri/contracts';
import { UiIcon } from '../../../shared/ui/UiIcon';
import { formatArea, formatVND, formatYield } from '../../../shared/utils/formatters';
import { OfferCard } from '../components/OfferCard';
import { useListingDetail } from '../hooks/useListingDetail';
import { useAcceptOffer, useOffers, useRejectOffer } from '../hooks/useOffers';
import './trading.css';

export function ListingOffersPage() {
  const { listingId } = useParams<{ listingId: string }>();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<OfferStatus | ''>('');
  const [confirmOffer, setConfirmOffer] = useState<OfferDTO | null>(null);
  const [rejectOfferConfirm, setRejectOfferConfirm] = useState<OfferDTO | null>(null);

  const { data: listing } = useListingDetail(listingId);
  const { data, isLoading, isError, error, refetch, isFetching } = useOffers({
    listingId,
    status: statusFilter ? statusFilter : undefined,
    page,
    size: 10,
  });

  const acceptMutation = useAcceptOffer();
  const rejectMutation = useRejectOffer();

  const handleConfirmAccept = () => {
    if (!confirmOffer) return;
    acceptMutation.mutate(confirmOffer.offerId, {
      onSuccess: () => {
        setConfirmOffer(null);
      },
    });
  };

  const handleConfirmReject = () => {
    if (!rejectOfferConfirm) return;
    rejectMutation.mutate(rejectOfferConfirm.offerId, {
      onSuccess: () => {
        setRejectOfferConfirm(null);
      },
    });
  };

  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const offersList = data?.items ?? [];

  const pendingCount = offersList.filter((o) => o.status === 'PENDING').length;
  const acceptedCount = offersList.filter((o) => o.status === 'ACCEPTED').length;
  const rejectedCount = offersList.filter((o) => o.status === 'REJECTED').length;

  return (
    <div className="trading-page listing-offers-page">
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb-nav" aria-label="Đường dẫn">
        <Link to="/bai-dang">Bài đăng của tôi</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/bai-dang/${listingId}`}>
          {listing ? listing.seedType : 'Chi tiết bài đăng'}
        </Link>
        <span aria-hidden="true">/</span>
        <span>Báo giá đã nhận</span>
      </nav>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Danh sách báo giá nhận được</h1>
          <p className="page-subtitle">
            Các đề xuất thu mua từ thương lái cho sản phẩm lúa{' '}
            <strong>{listing?.seedType || 'của bạn'}</strong>
          </p>
        </div>
        <Link to={`/bai-dang/${listingId}`} className="header-action-btn secondary">
          ← Xem lại bài đăng
        </Link>
      </div>

      {/* Produce Summary Recap Bar */}
      {listing && (
        <div className="produce-summary-banner">
          <div className="summary-col">
            <span className="summary-label">Sản phẩm chào bán:</span>
            <span className="summary-val">
              <UiIcon name="rice" size={16} /> {listing.seedType}
            </span>
          </div>
          <div className="summary-col">
            <span className="summary-label">Giá kỳ vọng:</span>
            <span className="summary-val highlight">{formatVND(listing.expectedPrice)}</span>
          </div>
          <div className="summary-col">
            <span className="summary-label">Sản lượng dự kiến:</span>
            <span className="summary-val">{formatYield(listing.estimatedYield)}</span>
          </div>
          <div className="summary-col">
            <span className="summary-label">Diện tích:</span>
            <span className="summary-val">{formatArea(listing.area)}</span>
          </div>
          <div className="summary-col">
            <span className="summary-label">Trạng thái bài đăng:</span>
            <span className={`status-pill status-${listing.status.toLowerCase()}`}>
              {listing.status === 'OPEN'
                ? 'Đang mở (OPEN)'
                : listing.status === 'LOCKED'
                  ? 'Đã nhận cọc (LOCKED)'
                  : 'Đã hoàn tất (SOLD)'}
            </span>
          </div>
        </div>
      )}

      {/* Offers Status Filter Tabs & Counts */}
      <div className="status-tabs-row" role="tablist" aria-label="Bộ lọc trạng thái báo giá">
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === ''}
          className={`status-tab ${statusFilter === '' ? 'active' : ''}`}
          onClick={() => {
            setStatusFilter('');
            setPage(0);
          }}
        >
          Tất cả đề xuất ({totalElements})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === 'PENDING'}
          className={`status-tab ${statusFilter === 'PENDING' ? 'active' : ''}`}
          onClick={() => {
            setStatusFilter('PENDING');
            setPage(0);
          }}
        >
          Đang chờ duyệt ({pendingCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === 'ACCEPTED'}
          className={`status-tab ${statusFilter === 'ACCEPTED' ? 'active' : ''}`}
          onClick={() => {
            setStatusFilter('ACCEPTED');
            setPage(0);
          }}
        >
          Đã chấp nhận ({acceptedCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={statusFilter === 'REJECTED'}
          className={`status-tab ${statusFilter === 'REJECTED' ? 'active' : ''}`}
          onClick={() => {
            setStatusFilter('REJECTED');
            setPage(0);
          }}
        >
          Đã từ chối ({rejectedCount})
        </button>
      </div>

      {/* Offers Content: Loading, Error, Empty, or List */}
      {isLoading ? (
        <div className="offers-skeleton-list" aria-busy="true">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="skeleton-card" style={{ height: '180px' }} />
          ))}
        </div>
      ) : isError ? (
        <div className="error-panel" role="alert">
          <span className="error-icon" aria-hidden="true">
            <UiIcon name="disputes" size={24} />
          </span>
          <h3>Không thể tải danh sách báo giá</h3>
          <p>{error?.message || 'Có lỗi kết nối máy chủ.'}</p>
          <button type="button" className="retry-btn" onClick={() => void refetch()}>
            Thử lại
          </button>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="empty-panel">
          <span className="empty-icon" aria-hidden="true">
            <UiIcon name="offers" size={28} />
          </span>
          <h3>Chưa có báo giá nào {statusFilter ? `ở trạng thái ${statusFilter}` : ''}</h3>
          <p>
            Các đề xuất thu mua từ thương lái cho sản phẩm này sẽ được hiển thị ở đây. Bạn có thể
            chấp nhận hoặc từ chối các mức giá đề xuất.
          </p>
        </div>
      ) : (
        <div className={`offers-list-container ${isFetching ? 'fetching' : ''}`}>
          {data.items.map((offer) => (
            <OfferCard
              key={offer.offerId}
              offer={offer}
              isFarmerView={true}
              onAccept={(item) => setConfirmOffer(item)}
              onReject={(item) => setRejectOfferConfirm(item)}
              isAccepting={acceptMutation.isPending && acceptMutation.variables === offer.offerId}
              isRejecting={rejectMutation.isPending && rejectMutation.variables === offer.offerId}
            />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="pagination-bar" aria-label="Phân trang báo giá">
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

      {/* Accept Offer Confirmation Modal */}
      {confirmOffer && (
        <div
          className="modal-backdrop"
          onClick={() => !acceptMutation.isPending && setConfirmOffer(null)}
          aria-hidden="true"
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setConfirmOffer(null)}
              disabled={acceptMutation.isPending}
              aria-label="Đóng"
            >
              <UiIcon name="close" size={18} />
            </button>

            <div className="modal-header">
              <span className="modal-leaf" aria-hidden="true">
                <UiIcon name="check" size={22} />
              </span>
              <div>
                <h3 id="confirm-modal-title">Chấp nhận báo giá này?</h3>
                <p className="modal-desc">
                  Thương lái: <code>{confirmOffer.traderId.slice(0, 8)}…</code> · Giá đề xuất:{' '}
                  <strong>{formatVND(confirmOffer.offeredPrice)}</strong>
                </p>
              </div>
            </div>

            {acceptMutation.isError && (
              <div className="alert alert-error" role="alert">
                {acceptMutation.error.message || 'Có lỗi xảy ra khi chấp nhận báo giá.'}
              </div>
            )}

            <div className="produce-recap-card">
              <p style={{ margin: 0, fontSize: '13.5px', color: '#164735', lineHeight: 1.5 }}>
                Khi bạn nhấn <strong>Xác nhận chấp nhận</strong>:
              </p>
              <ul
                style={{
                  margin: '8px 0 0',
                  paddingLeft: '20px',
                  fontSize: '13px',
                  color: '#607267',
                }}
              >
                <li>
                  Phòng hội thoại Chat bảo mật giữa bạn và thương lái sẽ tự động được khởi tạo.
                </li>
                <li>
                  Hai bên thương lượng chốt ngày cắt lúa, phương thức vận chuyển và điều khoản hợp
                  đồng.
                </li>
                <li>
                  Báo giá này sẽ chuyển sang trạng thái <strong>ACCEPTED</strong>.
                </li>
              </ul>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn primary"
                disabled={acceptMutation.isPending}
                onClick={handleConfirmAccept}
              >
                {acceptMutation.isPending
                  ? 'Đang kích hoạt phòng Chat…'
                  : 'Xác nhận chấp nhận & Mở Chat'}
              </button>
              <button
                type="button"
                className="modal-btn secondary"
                disabled={acceptMutation.isPending}
                onClick={() => setConfirmOffer(null)}
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Offer Confirmation Modal */}
      {rejectOfferConfirm && (
        <div
          className="modal-backdrop"
          onClick={() => !rejectMutation.isPending && setRejectOfferConfirm(null)}
          aria-hidden="true"
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-modal-title"
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setRejectOfferConfirm(null)}
              disabled={rejectMutation.isPending}
              aria-label="Đóng"
            >
              <UiIcon name="close" size={18} />
            </button>

            <div className="modal-header">
              <span
                className="modal-leaf"
                aria-hidden="true"
                style={{ background: '#fdf2f2', color: '#a83939' }}
              >
                <UiIcon name="ban" size={22} />
              </span>
              <div>
                <h3 id="reject-modal-title">Từ chối mức giá này?</h3>
                <p className="modal-desc">
                  Thương lái đề xuất: <strong>{formatVND(rejectOfferConfirm.offeredPrice)}</strong>
                </p>
              </div>
            </div>

            {rejectMutation.isError && (
              <div className="alert alert-error" role="alert">
                {rejectMutation.error.message || 'Có lỗi xảy ra khi từ chối báo giá.'}
              </div>
            )}

            <div className="produce-recap-card">
              <p style={{ margin: 0, fontSize: '13px', color: '#607267', lineHeight: 1.5 }}>
                Khi bạn từ chối, báo giá này sẽ chuyển sang trạng thái <strong>REJECTED</strong>.
                Thương lái sẽ nhận được thông báo và có thể điều chỉnh để gửi lại mức giá cạnh tranh
                hơn.
              </p>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn primary"
                style={{ backgroundColor: '#a83939' }}
                disabled={rejectMutation.isPending}
                onClick={handleConfirmReject}
              >
                {rejectMutation.isPending ? 'Đang từ chối…' : 'Xác nhận từ chối'}
              </button>
              <button
                type="button"
                className="modal-btn secondary"
                disabled={rejectMutation.isPending}
                onClick={() => setRejectOfferConfirm(null)}
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
