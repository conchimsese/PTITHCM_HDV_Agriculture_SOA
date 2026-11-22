import React, { useState } from 'react';
import { useFarming } from '../../contexts/FarmingContext';
import { reportsApi } from '../../services/farming.service';
import PlotSeasonSwitcher from '../../components/common/PlotSeasonSwitcher';
import EmptyState from '../../components/common/EmptyState';
import Icon from '../../components/common/Icon';
import {
  formatCurrency,
  formatDateVN,
  formatArea,
  formatYield,
  getStatusBadge,
  WORK_TYPE_LABELS,
} from '../../utils/formatters';

export default function ReportsPage() {
  const { activeSeason, reportData, loadingReport } = useFarming();
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const plot = reportData?.plot;
  const season = reportData?.season;
  const summary = reportData?.summary;
  const logs = reportData?.logs || [];
  const costs = reportData?.costs || [];

  const handleDownloadPdf = async () => {
    if (!activeSeason) return;
    try {
      setDownloadingPdf(true);
      setPdfError('');
      const response = await reportsApi.downloadPdf(activeSeason.cropSeasonId);
      
      // Create blob link and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Bao_cao_mua_vu_${activeSeason.seasonName || activeSeason.cropSeasonId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Lỗi tải PDF:', err);
      setPdfError(err.message || 'Không thể tải báo cáo PDF từ hệ thống.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="reports-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--brand-green, #164735)' }}>
            Báo Cáo Tổng Hợp Mùa Vụ
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #617D71)', fontSize: '0.9rem' }}>
            Tổng hợp dữ liệu canh tác, chi phí đầu tư và sản lượng thu hoạch theo mùa vụ
          </p>
        </div>
        {activeSeason && (
          <button
            className="btn btn-primary"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || loadingReport}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Icon name="download" size={16} />
            {downloadingPdf ? 'Đang tạo PDF...' : 'Tải Báo Cáo PDF'}
          </button>
        )}
      </div>

      <PlotSeasonSwitcher />

      {pdfError && (
        <div style={{ backgroundColor: '#FCE8E6', color: '#C5221F', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
          {pdfError}
        </div>
      )}

      {!activeSeason ? (
        <EmptyState
          title="Chưa chọn mùa vụ để xem báo cáo"
          description="Vui lòng chọn ruộng và mùa vụ ở thanh công cụ phía trên."
          actionText="Đi đến Mùa Vụ"
          actionUrl="/season"
        />
      ) : loadingReport ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#617D71' }}>
          Đang tổng hợp dữ liệu báo cáo từ Backend...
        </div>
      ) : !reportData ? (
        <EmptyState
          title="Không tìm thấy dữ liệu báo cáo"
          description="Hệ thống không thể truy xuất báo cáo của mùa vụ này."
        />
      ) : (
        <div className="report-content">
          {/* Top Status Header */}
          <div className="card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--brand-green, #164735)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--brand-green, #164735)' }}>
                    {season?.seasonName || 'Mùa vụ'}
                  </h2>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: getStatusBadge(season?.status).bg,
                      color: getStatusBadge(season?.status).color,
                    }}
                  >
                    {getStatusBadge(season?.status).label}
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary, #617D71)', fontSize: '0.9rem' }}>
                  Ruộng: <strong style={{ color: '#164735' }}>{plot?.name}</strong> • Vị trí: {plot?.location} • Diện tích: <strong>{formatArea(plot?.area)}</strong>
                </div>
                <div style={{ color: 'var(--text-secondary, #617D71)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Thời gian: {formatDateVN(season?.startDate)} → {formatDateVN(season?.endDate)} • Giống lúa: <strong>{season?.cropType || 'Chưa cập nhật'}</strong>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <button
                  className="btn btn-outline"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                >
                  <Icon name="download" size={14} /> {downloadingPdf ? 'Đang tạo...' : 'Xuất File PDF'}
                </button>
              </div>
            </div>
          </div>

          {/* Metric Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #617D71)', textTransform: 'uppercase' }}>Tổng Chi Phí</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#C5221F', marginTop: '4px' }}>
                {formatCurrency(summary?.totalCost)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#617D71', marginTop: '4px' }}>
                Từ {costs.length} khoản chi phí
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #617D71)', textTransform: 'uppercase' }}>Sản Lượng Dự Kiến</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#164735', marginTop: '4px' }}>
                {formatYield(season?.expectedYield)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#617D71', marginTop: '4px' }}>
                Theo kế hoạch mùa vụ
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #617D71)', textTransform: 'uppercase' }}>Sản Lượng Thực Tế</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#D8AD47', marginTop: '4px' }}>
                {formatYield(season?.actualYield)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#617D71', marginTop: '4px' }}>
                {season?.status === 'COMPLETED' ? 'Đã thu hoạch' : 'Đang canh tác'}
              </div>
            </div>

            <div className="card" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #617D71)', textTransform: 'uppercase' }}>Nhật Ký Canh Tác</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1A73E8', marginTop: '4px' }}>
                {logs.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#617D71', marginTop: '4px' }}>
                Lần ghi nhận hoạt động
              </div>
            </div>
          </div>

          {/* Section: Nhật Ký Hoạt Động Canh Tác */}
          <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color, #E5E9E2)', fontWeight: 600, color: 'var(--brand-green, #164735)' }}>
              1. Danh Sách Hoạt Động Canh Tác ({logs.length})
            </div>
            {logs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#617D71', fontSize: '0.9rem' }}>
                Chưa có nhật ký canh tác nào được ghi nhận cho mùa vụ này.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle, #F8FAF7)', color: 'var(--text-secondary, #617D71)', borderBottom: '1px solid var(--border-color, #E5E9E2)' }}>
                      <th style={{ padding: '10px 16px', width: '130px' }}>Ngày Thực Hiện</th>
                      <th style={{ padding: '10px 16px', width: '160px' }}>Loại Công Việc</th>
                      <th style={{ padding: '10px 16px' }}>Mô Tả Chi Tiết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.logId} style={{ borderBottom: '1px solid var(--border-color, #E5E9E2)' }}>
                        <td style={{ padding: '10px 16px', color: 'var(--text-secondary, #617D71)', whiteSpace: 'nowrap' }}>
                          {formatDateVN(log.logDate)}
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 600 }}>
                          {WORK_TYPE_LABELS[log.workType] || log.workType}
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-secondary, #617D71)' }}>
                          {log.description || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Bảng Kê Chi Phí */}
          <div className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-color, #E5E9E2)', fontWeight: 600, color: 'var(--brand-green, #164735)' }}>
              2. Bảng Kê Chi Phí Đầu Tư ({costs.length})
            </div>
            {costs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#617D71', fontSize: '0.9rem' }}>
                Chưa có chi phí nào được ghi nhận cho mùa vụ này.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle, #F8FAF7)', color: 'var(--text-secondary, #617D71)', borderBottom: '1px solid var(--border-color, #E5E9E2)' }}>
                      <th style={{ padding: '10px 16px', width: '130px' }}>Ngày Chi</th>
                      <th style={{ padding: '10px 16px' }}>Hạng Mục</th>
                      <th style={{ padding: '10px 16px' }}>Mô Tả / Ghi Chú</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', width: '160px' }}>Số Tiền (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costs.map((cost) => (
                      <tr key={cost.costId} style={{ borderBottom: '1px solid var(--border-color, #E5E9E2)' }}>
                        <td style={{ padding: '10px 16px', color: 'var(--text-secondary, #617D71)', whiteSpace: 'nowrap' }}>
                          {formatDateVN(cost.incurredDate)}
                        </td>
                        <td style={{ padding: '10px 16px', fontWeight: 600 }}>
                          {cost.category}
                        </td>
                        <td style={{ padding: '10px 16px', color: 'var(--text-secondary, #617D71)' }}>
                          {cost.description || '—'}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#164735' }}>
                          {formatCurrency(cost.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg-subtle, #F8FAF7)', fontWeight: 700 }}>
                      <td colSpan="3" style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--brand-green, #164735)' }}>
                        Tổng Chi Phí Mùa Vụ:
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--brand-green, #164735)', fontSize: '1.05rem' }}>
                        {formatCurrency(summary?.totalCost)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
