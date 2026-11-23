import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { CreateOfferRequest, ListingDTO, OfferDTO } from '@agri/contracts';
import { tradingApi } from '../../../shared/api/runtime';
import { UiIcon } from '../../../shared/ui/UiIcon';
import {
  formatArea,
  formatPricePerKg,
  formatVND,
  formatYield,
} from '../../../shared/utils/formatters';

interface QuickOfferModalProps {
  listing: ListingDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (offer: OfferDTO) => void;
}

export function QuickOfferModal({ listing, isOpen, onClose, onSuccess }: QuickOfferModalProps) {
  const queryClient = useQueryClient();
  const [createdOffer, setCreatedOffer] = useState<OfferDTO | null>(null);
  const [offeredPriceInput, setOfferedPriceInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync price input when listing changes
  useEffect(() => {
    if (listing) {
      const rounded = Math.round(parseFloat(listing.expectedPrice) || 0);
      setOfferedPriceInput(rounded > 0 ? String(rounded) : listing.expectedPrice);
    }
  }, [listing]);

  const offerMutation = useMutation({
    mutationFn: async (payload: CreateOfferRequest) => {
      const idempotencyKey = crypto.randomUUID();
      return tradingApi.createOffer(payload, idempotencyKey);
    },
    onSuccess: (offer) => {
      setCreatedOffer(offer);
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      onSuccess?.(offer);
    },
    onError: (err: Error) => {
      if (err.message.includes('PENDING_OFFER_EXISTS')) {
        setErrorMessage(
          'Bạn đã có 1 báo giá đang chờ duyệt trên bài đăng này. Vui lòng chờ nông dân phản hồi hoặc hủy báo giá cũ trước khi gửi lại.',
        );
      } else if (err.message.includes('SELF_OFFER_NOT_ALLOWED')) {
        setErrorMessage('Bạn không thể gửi báo giá cho bài đăng của chính mình.');
      } else if (err.message.includes('LISTING_NOT_OPEN')) {
        setErrorMessage('Bài đăng hiện không còn mở nhận báo giá (đã cọc hoặc đã bán).');
      } else {
        setErrorMessage(err.message || 'Không thể gửi báo giá. Vui lòng thử lại sau.');
      }
    },
  });

  if (!isOpen || !listing) return null;

  const handleClose = () => {
    setCreatedOffer(null);
    setErrorMessage(null);
    onClose();
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setOfferedPriceInput(raw);
    setErrorMessage(null);
  };

  const handlePriceBlur = () => {
    if (!offeredPriceInput) return;
    const num = parseFloat(offeredPriceInput);
    if (!isNaN(num) && num > 0) {
      setOfferedPriceInput(String(Math.round(num)));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let cleanPrice = offeredPriceInput.trim();
    const num = parseFloat(cleanPrice);
    if (isNaN(num) || num <= 0) {
      setErrorMessage('Giá đề xuất thu mua phải là số tiền dương.');
      return;
    }
    if (!cleanPrice.includes('.')) {
      cleanPrice = `${cleanPrice}.00`;
    }

    offerMutation.mutate({
      listingId: listing.listingId,
      offeredPrice: cleanPrice,
    });
  };

  // Compare diff between offered and expected price
  const expectedNum = parseFloat(listing.expectedPrice) || 0;
  const offeredNum = parseFloat(offeredPriceInput) || 0;
  const priceDiffPct =
    expectedNum > 0 && offeredNum > 0
      ? Math.round(((offeredNum - expectedNum) / expectedNum) * 100)
      : 0;
  const expectedPerKg = formatPricePerKg(listing.expectedPrice, listing.estimatedYield);
  const offeredPerKg = formatPricePerKg(offeredPriceInput, listing.estimatedYield);
  const applyPriceRatio = (ratio: number) => {
    if (expectedNum <= 0) return;
    setOfferedPriceInput(String(Math.round(expectedNum * ratio)));
    setErrorMessage(null);
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={handleClose}
          aria-label="Đóng hộp thoại"
        >
          <UiIcon name="close" size={18} />
        </button>

        {createdOffer ? (
          <div className="offer-success-view">
            <span className="success-icon" aria-hidden="true">
              <UiIcon name="check" size={28} />
            </span>
            <h3 id="modal-title">Gửi báo giá thành công!</h3>
            <p className="success-message">
              Đề xuất thu mua lúa <strong>{listing.seedType}</strong> với mức giá{' '}
              <strong>{formatVND(createdOffer.offeredPrice)}</strong> đã được gửi tới nông dân.
            </p>
            <div className="offer-summary-card">
              <div className="summary-row">
                <span>Mã báo giá:</span>
                <code>{createdOffer.offerId.slice(0, 8)}…</code>
              </div>
              <div className="summary-row">
                <span>Giá bạn đề xuất:</span>
                <strong className="summary-highlight">
                  {formatVND(createdOffer.offeredPrice)}
                </strong>
              </div>
              <div className="summary-row">
                <span>Trạng thái:</span>
                <span className="status-badge pending">Đang chờ nông dân phản hồi</span>
              </div>
            </div>
            <div className="modal-actions">
              <Link to="/bao-gia" className="modal-btn primary" onClick={handleClose}>
                Xem danh sách báo giá của tôi →
              </Link>
              <button type="button" className="modal-btn secondary" onClick={handleClose}>
                Tiếp tục xem thị trường
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="offer-form">
            <div className="modal-header">
              <span className="modal-leaf" aria-hidden="true">
                <UiIcon name="rice" size={22} />
              </span>
              <div>
                <h3 id="modal-title">Gửi báo giá thu mua lúa</h3>
                <p className="modal-desc">
                  Thương lái có thể đề xuất mức giá thu mua mong muốn (bằng, cao hơn hoặc thấp hơn
                  giá chào bán)
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="alert alert-error" role="alert">
                {errorMessage}
              </div>
            )}

            {/* Produce Information Card */}
            <div className="produce-recap-card">
              <div className="recap-header">
                <span className="recap-title">{listing.seedType}</span>
                <div className="recap-price-block">
                  <span className="recap-price-label">Giá mong muốn của nông dân:</span>
                  <span className="recap-price">{formatVND(listing.expectedPrice)}</span>
                  {expectedPerKg && (
                    <span className="price-per-kg tabular-nums">({expectedPerKg})</span>
                  )}
                </div>
              </div>
              <div className="recap-details">
                <div className="detail-item">
                  <span className="detail-label">Sản lượng dự kiến:</span>
                  <span className="detail-val">{formatYield(listing.estimatedYield)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Diện tích canh tác:</span>
                  <span className="detail-val">{formatArea(listing.area)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Tọa độ ruộng:</span>
                  <span className="detail-val">
                    {listing.latitude.toFixed(4)}, {listing.longitude.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {/* Price Counter-Offer Input */}
            <div className="offer-price-input-section">
              <label className="field-label" htmlFor="offeredPrice">
                Mức giá bạn đề xuất thu mua (VND) <span className="required">*</span>
              </label>
              <div className="quick-offer-chips" role="group" aria-label="Điều chỉnh nhanh mức giá">
                <button
                  type="button"
                  className="quick-offer-chip"
                  onClick={() => applyPriceRatio(0.98)}
                >
                  -2%
                </button>
                <button
                  type="button"
                  className="quick-offer-chip"
                  onClick={() => applyPriceRatio(1)}
                >
                  Bằng giá nông dân
                </button>
                <button
                  type="button"
                  className="quick-offer-chip"
                  onClick={() => applyPriceRatio(1.02)}
                >
                  +2%
                </button>
              </div>
              <div className="price-input-wrapper">
                <input
                  id="offeredPrice"
                  type="text"
                  inputMode="numeric"
                  value={offeredPriceInput}
                  onChange={handlePriceChange}
                  onBlur={handlePriceBlur}
                  placeholder="Ví dụ: 90000000"
                  required
                  className="form-input tabular-nums"
                />
                <span className="currency-suffix">VND</span>
              </div>

              {offeredPriceInput && (
                <div className="price-feedback-row">
                  <span className="preview-tag tabular-nums">
                    Quy đổi: <strong>{formatVND(offeredPriceInput)}</strong>
                    {offeredPerKg ? ` (${offeredPerKg})` : ''}
                  </span>
                  {priceDiffPct === 0 ? (
                    <span className="diff-badge equal">Bằng giá nông dân chào</span>
                  ) : priceDiffPct > 0 ? (
                    <span className="diff-badge higher">
                      +{priceDiffPct}% (Trả giá cao hơn để ưu tiên chốt)
                    </span>
                  ) : (
                    <span className="diff-badge lower">
                      {priceDiffPct}% (Đề xuất thương lượng giá thấp hơn)
                    </span>
                  )}
                </div>
              )}
            </div>

            <p className="form-note">
              <UiIcon name="info" size={16} />{' '}
              <span>
                Báo giá được gửi ở trạng thái <strong>chờ nông dân xem xét</strong>, chưa cần nạp
                tiền cọc trước. Khi nông dân đồng ý, hệ thống sẽ mở phòng trò chuyện để hai bên trao
                đổi. Bạn có thể hủy đề xuất bất cứ lúc nào khi chưa được chốt.
              </span>
            </p>

            <div className="modal-actions">
              <button
                type="submit"
                className="modal-btn primary"
                disabled={offerMutation.isPending || !offeredPriceInput}
              >
                {offerMutation.isPending ? 'Đang gửi đề xuất…' : 'Xác nhận gửi báo giá'}
              </button>
              <button
                type="button"
                className="modal-btn secondary"
                onClick={handleClose}
                disabled={offerMutation.isPending}
              >
                Hủy bỏ
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
