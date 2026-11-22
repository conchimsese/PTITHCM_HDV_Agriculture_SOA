export function formatMoney(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
}

export function formatCurrency(amount) {
  return formatMoney(amount);
}

export function formatNumber(num) {
  return new Intl.NumberFormat('vi-VN').format(Number(num) || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('vi-VN');
  } catch {
    return dateStr;
  }
}

export function formatDateVN(dateStr) {
  return formatDate(dateStr);
}

export function formatDateInput(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export function formatArea(area) {
  if (area === undefined || area === null) return '—';
  return `${Number(area).toLocaleString('vi-VN')} m²`;
}

export function formatYield(yieldVal) {
  if (yieldVal === undefined || yieldVal === null) return 'Chưa có';
  return `${Number(yieldVal).toLocaleString('vi-VN')} kg`;
}

export function getStatusBadge(status) {
  switch (status) {
    case 'IN_PROGRESS':
      return { label: 'Đang canh tác', bg: '#E6F4EA', color: '#137333' };
    case 'COMPLETED':
      return { label: 'Đã hoàn thành', bg: '#E8F0FE', color: '#1A73E8' };
    case 'CANCELLED':
      return { label: 'Đã hủy', bg: '#FCE8E6', color: '#C5221F' };
    default:
      return { label: status || 'Không xác định', bg: '#F1F3F4', color: '#5F6368' };
  }
}

export const WORK_TYPES = {
  LAND_PREPARATION: 'Làm đất',
  PLANTING: 'Gieo sạ',
  PEST_CONTROL: 'Phòng trừ sâu bệnh',
  WATERING: 'Tưới / điều tiết nước',
  FERTILIZING: 'Bón phân',
  HARVESTING: 'Thu hoạch'
};

export const WORK_TYPE_LABELS = WORK_TYPES;

export const SEASON_STATUS = {
  IN_PROGRESS: 'Đang canh tác',
  COMPLETED: 'Đã hoàn thành'
};
