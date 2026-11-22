import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { OfferDTO, OfferStatus } from '@agri/contracts';
import { useSession } from '../../../shared/hooks/useAuth';
import { formatVND } from '../../../shared/utils/formatters';
import { OfferCard } from '../components/OfferCard';
import { useCancelOffer, useOffers } from '../hooks/useOffers';
import './trading.css';

export function MyOffersPage() {
  const session = useSession();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<OfferStatus | ''>('');
  const [cancelOfferConfirm, setCancelOfferConfirm] = useState<OfferDTO | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useOffers({
    traderId: session?.accountId,
    status: statusFilter ? statusFilter : undefined,
    page,
    size: 10,
  });

  const cancelMutation = useCancelOffer();

  const handleConfirmCancel = () => {
    if (!cancelOfferConfirm) return;
    cancelMutation.mutate(cancelOfferConfirm.offerId, {
      onSuccess: () => {
        setCancelOfferConfirm(null);
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
    <div className="trading-page my-offers-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Báo giá của tôi</h1>
          <p className="page-subtitle">
            Theo dõi tình trạng các đề xuất thu mua bạn đã gửi tới nông dân trên sàn thị trường
          </p>
        </div>
        <Link to="/thi-truong" className="header-action-btn secondary">
          🛒 Khám phá thị trường lúa
        </Link>
      </div>

      {/* Summary Metrics Cards */}
      <div className="farmer-metrics-row">
        <div className="metric-card">
          <span className="metric-icon" aria-hidden="true">
            📋
          </span>
          <div className="metric-content">
            <span className="metric-label">Tổng báo giá đã gửi</span>
            <span className="metric-value">{totalElements}</span>
          </div>
        </div>

        <div className="metric-card">
          <span className="metric-icon" aria-hidden="true">
            ⏳
          </span>
          <div className="metric-content">
            <span className="metric-label">Đang chờ phản hồi</span>
            <span className="metric-value open">{pendingCount}</span>
          </div>
        </div>

        <div className="metric-card">
          <span className="metric-icon" aria-hidden="true">
            💬
          </span>
          <div className="metric-content">
            <span className="metric-label">Đã được duyệt (Sẵn sàng Chat)</span>
            <span className="metric-value" style={{ color: '#246b45' }}>
              {acceptedCount}
            </span>
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
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
          Tất cả báo giá ({totalElements})
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
          Đã được chấp nhận ({acceptedCount})
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
            ⚠️
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
            🛒
          </span>
          <h3>Bạn chưa có báo giá nào {statusFilter ? `ở trạng thái ${statusFilter}` : ''}</h3>
          <p>
            Tìm kiếm các sản phẩm lúa chất lượng trên sàn thị trường và gửi báo giá để bắt đầu kết
            nối với nhà nông.
          </p>
          <Link to="/thi-truong" className="primary-button" style={{ marginTop: '12px' }}>
            🛒 Đến sàn thị trường lúa ngay
          </Link>
        </div>
      ) : (
        <div className={`offers-list-container ${isFetching ? 'fetching' : ''}`}>
          {data.items.map((offer) => (
            <OfferCard
              key={offer.offerId}
              offer={offer}
              isFarmerView={false}
              onCancel={(item) => setCancelOfferConfirm(item)}
              isCancelling={cancelMutation.isPending && cancelMutation.variables === offer.offerId}
            />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="pagination-bar" aria-label="Phân trang báo giá của tôi">
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

      {/* Cancel Offer Confirmation Modal */}
      {cancelOfferConfirm && (
        <div
          className="modal-backdrop"
          onClick={() => !cancelMutation.isPending && setCancelOfferConfirm(null)}
          aria-hidden="true"
        >
          <div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
          >
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setCancelOfferConfirm(null)}
              disabled={cancelMutation.isPending}
              aria-label="Đóng"
            >
              ✕
            </button>

            <div className="modal-header">
              <span className="modal-leaf" aria-hidden="true">
                ↩️
              </span>
              <div>
                <h3 id="cancel-modal-title">Rút lại báo giá này?</h3>
                <p className="modal-desc">
                  Mức giá đã đề xuất: <strong>{formatVND(cancelOfferConfirm.offeredPrice)}</strong>
                </p>
              </div>
            </div>

            {cancelMutation.isError && (
              <div className="alert alert-error" role="alert">
                {cancelMutation.error.message || 'Có lỗi xảy ra khi hủy báo giá.'}
              </div>
            )}

            <div className="produce-recap-card">
              <p style={{ margin: 0, fontSize: '13px', color: '#607267', lineHeight: 1.5 }}>
                Báo giá sẽ chuyển sang trạng thái <strong>CANCELLED</strong>. Bạn có thể gửi lại báo
                giá mới với mức giá điều chỉnh trên bài đăng này bất cứ lúc nào.
              </p>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="modal-btn primary"
                disabled={cancelMutation.isPending}
                onClick={handleConfirmCancel}
              >
                {cancelMutation.isPending ? 'Đang rút lại…' : 'Xác nhận rút lại'}
              </button>
              <button
                type="button"
                className="modal-btn secondary"
                disabled={cancelMutation.isPending}
                onClick={() => setCancelOfferConfirm(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
