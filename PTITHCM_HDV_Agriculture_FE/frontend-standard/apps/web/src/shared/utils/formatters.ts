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
