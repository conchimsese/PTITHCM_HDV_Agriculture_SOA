import { describe, expect, it } from 'vitest';
import { getRiceArtwork } from '../../features/trading/utils/riceArtwork';
import { formatPricePerKg, humanizeSystemText } from './formatters';

describe('formatPricePerKg', () => {
  it('computes rounded VND/kg for valid total price and kg yield', () => {
    expect(formatPricePerKg('90000000.00', 11200)).toBe('~8.036 đ/kg');
    expect(formatPricePerKg(148000000, 18500)).toBe('~8.000 đ/kg');
  });

  it('returns empty string for zero or invalid inputs', () => {
    expect(formatPricePerKg(0, 1000)).toBe('');
    expect(formatPricePerKg('90000000', 0)).toBe('');
    expect(formatPricePerKg('abc', 1000)).toBe('');
  });
});

describe('humanizeSystemText', () => {
  it('translates backend enums and raw .00 VND amounts into Vietnamese', () => {
    const raw =
      'Trạng thái hợp đồng chuyển sang ACTIVE sau cọc 3750000.00 cho offer; tranh chấp UNDER_REVIEW (DELIVERY_ISSUE).';
    expect(humanizeSystemText(raw)).toBe(
      'Trạng thái hợp đồng chuyển sang Đang hiệu lực sau cọc 3.750.000\u00a0₫ cho báo giá; tranh chấp Đang xem xét (Chậm lịch giao nhận).',
    );
  });
});

describe('getRiceArtwork', () => {
  it('prioritizes ST25 even when seedType contains "thơm"', () => {
    expect(getRiceArtwork('Lúa thơm ST25').label).toBe('Minh họa giống lúa ST25');
    expect(getRiceArtwork('Đài Thơm 8').label).toBe('Minh họa giống lúa Đài Thơm 8');
  });
});
