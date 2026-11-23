/**
 * Utility display formatters for Ruộng Lúa Việt UI
 */

/**
 * Format string decimal VND currency to localized string: "4.500.000 ₫"
 */
export function formatVND(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format crop yield in kilograms to Metric Tons (tấn) or kg
 */
export function formatYield(kg: number): string {
  if (isNaN(kg) || kg <= 0) return '0 kg';
  if (kg >= 1000) {
    const tons = kg / 1000;
    return `${tons.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tấn`;
  }
  return `${kg.toLocaleString('vi-VN')} kg`;
}

/**
 * Format land area in square meters (m²)
 */
export function formatArea(m2: number): string {
  if (isNaN(m2) || m2 <= 0) return '0 m²';
  if (m2 >= 10000) {
    const ha = m2 / 10000;
    return `${ha.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ha (${m2.toLocaleString('vi-VN')} m²)`;
  }
  return `${m2.toLocaleString('vi-VN')} m²`;
}

/**
 * Format distance in kilometers
 */
export function formatDistance(km?: number): string {
  if (km === undefined || isNaN(km)) return '';
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Format ISO datetime string to localized Vietnamese format
 */
export function formatDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

/**
 * Format estimated VND price per kg: "~8.036 đ/kg"
 */
export function formatPricePerKg(totalPrice: string | number, estimatedYieldKg: number): string {
  const price = typeof totalPrice === 'string' ? parseFloat(totalPrice) : totalPrice;
  if (
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isFinite(estimatedYieldKg) ||
    estimatedYieldKg <= 0
  ) {
    return '';
  }
  const perKg = Math.round(price / estimatedYieldKg);
  if (perKg <= 0) return '';
  return `~${perKg.toLocaleString('vi-VN')} đ/kg`;
}

const SYSTEM_TERM_MAP: Record<string, string> = {
  PENDING_DEPOSIT: 'Chờ đặt cọc',
  RELEASABLE: 'Có thể giải phóng',
  UNDER_REVIEW: 'Đang xem xét',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  REFUNDED: 'Đã hoàn tiền',
  ACTIVE: 'Đang hiệu lực',
  DELIVERY_ISSUE: 'Chậm lịch giao nhận',
  QUALITY_MISMATCH: 'Sai chất lượng thỏa thuận',
  QUANTITY_SHORTAGE: 'Thiếu sản lượng thỏa thuận',
  PAYMENT_ISSUE: 'Vấn đề thanh toán / tiền cọc',
  FARMER_VIOLATION: 'Bên bán vi phạm thỏa thuận',
  NO_VIOLATION: 'Không có vi phạm',
  REFUND_TO_TRADER: 'Hoàn cọc cho thương lái',
  PENDING: 'Đang chờ duyệt',
  ACCEPTED: 'Đã chấp nhận',
  REJECTED: 'Đã từ chối',
  OPEN: 'Đang mở',
  LOCKED: 'Đã đặt cọc',
  SOLD: 'Đã bán',
};

const SYSTEM_TERM_PATTERN = new RegExp(`\\b(${Object.keys(SYSTEM_TERM_MAP).join('|')})\\b`, 'g');

/**
 * Replace raw backend enum codes and ".00" decimal strings with friendly Vietnamese.
 */
export function humanizeSystemText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\b(\d{4,})\.00(?:\s*(?:VND|VNĐ|đ|₫))?\b/g, (_, digits: string) =>
      formatVND(Number(digits)),
    )
    .replace(SYSTEM_TERM_PATTERN, (code) => SYSTEM_TERM_MAP[code] ?? code)
    .replace(/\boffer\b/g, 'báo giá');
}
