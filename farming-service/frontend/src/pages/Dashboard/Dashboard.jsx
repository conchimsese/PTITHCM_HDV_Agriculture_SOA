import React, { useState, useEffect } from 'react';
import { useFarming } from '../../contexts/FarmingContext';
import { reportsApi } from '../../services/farming.service';
import { formatNumber, formatMoney, WORK_TYPES } from '../../utils/formatters';
import Icon from '../../components/common/Icon';
import EmptyState from '../../components/common/EmptyState';
import { NavLink } from 'react-router-dom';

export function Dashboard() {
  const { plots, currentPlot, currentSeason, loading } = useFarming();
  const [report, setReport] = useState(null);
  const [fetchingReport, setFetchingReport] = useState(false);

  useEffect(() => {
    if (!currentSeason) {
      setReport(null);
      return;
    }

    let isMounted = true;
    setFetchingReport(true);
    reportsApi.getReport(currentSeason.cropSeasonId)
      .then(data => {
        if (isMounted) setReport(data);
      })
      .catch(() => {
        if (isMounted) setReport(null);
      })
      .finally(() => {
        if (isMounted) setFetchingReport(false);
      });

    return () => { isMounted = false; };
  }, [currentSeason]);

  if (loading) {
    return <div className="card loading-state">Đang tải thông tin ruộng và mùa vụ...</div>;
  }

  if (plots.length === 0) {
    return (
      <div className="content-width">
        <EmptyState
          title="Chưa có ruộng lúa"
          description="Bà con chưa có thửa ruộng nào trong hệ thống. Hãy thêm thửa ruộng đầu tiên để bắt đầu canh tác."
          icon="field"
          actionLabel="Thêm ruộng lúa"
          onAction={() => window.location.href = '/plots'}
        />
      </div>
    );
  }

  return (
    <div className="content-width">
      <div className="page-head">
        <span className="kicker">Bảng tin mùa vụ</span>
        <h1>Hôm nay ruộng lúa thế nào?</h1>
        <p>Theo dõi công việc đã làm và ghi chép chi phí canh tác lúa nước.</p>
      </div>

      {/* Hero Card for Current Season */}
      {currentSeason ? (
        <div className="card card-hero">
          <div className="row" style={{ alignItems: 'start' }}>
            <div className="flex1">
              <span className="chip">
                <Icon name="sprout" size="sm" />
                Mùa vụ đang canh tác
              </span>
              <h2>{currentSeason.seasonName} · {currentPlot?.name}</h2>
              <p>
                Giống lúa <strong>{currentSeason.cropType}</strong> · Diện tích {formatNumber(currentPlot?.area)} m²
                {currentSeason.expectedYield ? ` · Sản lượng dự kiến ${formatNumber(currentSeason.expectedYield)} kg` : ''}
              </p>
              <div className="button-row" style={{ marginTop: '14px' }}>
                <NavLink to="/season" className="btn primary">
                  <span>Xem mùa vụ</span>
                  <Icon name="arrow" size="sm" />
                </NavLink>
                <NavLink to="/journal" className="btn">
                  <Icon name="plus" size="sm" />
                  <span>Ghi nhật ký</span>
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card callout info">
          <h3>Thửa ruộng {currentPlot?.name} chưa có mùa vụ</h3>
          <p>Bà con hãy tạo mùa vụ đầu tiên cho ruộng này để ghi nhận nhật ký và chi phí.</p>
          <div style={{ marginTop: '10px' }}>
            <NavLink to="/season" className="btn primary sm">
              <Icon name="plus" size="sm" />
              <span>Tạo mùa vụ mới</span>
            </NavLink>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <div className="card-row">
          <h2>Hôm nay bà con muốn làm gì?</h2>
          <span className="chip neutral">Thao tác nhanh</span>
        </div>
        <div className="quick-actions" style={{ marginTop: '14px' }}>
          <NavLink to="/journal" className="quick-action">
            <Icon name="book" size="lg" />
            <span>Ghi việc đã làm</span>
          </NavLink>
          <NavLink to="/costs" className="quick-action">
            <Icon name="wallet" size="lg" />
            <span>Ghi chi phí</span>
          </NavLink>
          <NavLink to="/plots" className="quick-action">
            <Icon name="field" size="lg" />
            <span>Xem ruộng lúa</span>
          </NavLink>
          <NavLink to="/reports" className="quick-action">
            <Icon name="file" size="lg" />
            <span>Xem báo cáo</span>
          </NavLink>
        </div>
      </div>

      {/* Summary Stats if report loaded */}
      {report && (
        <div className="card">
          <div className="card-row">
            <h2>Tổng quan số liệu vụ mùa</h2>
            <span className="chip">{report.cropSeason.status}</span>
          </div>
          <div className="stats" style={{ marginTop: '14px' }}>
            <div className="stat">
              <span className="label">Tổng chi phí đã ghi</span>
              <strong style={{ fontSize: '18px', color: 'var(--brand-900)' }}>
                {formatMoney(report.summary.totalCost)}
              </strong>
            </div>
            <div className="stat">
              <span className="label">Số nhật ký công việc</span>
              <strong>{report.farmingLogs.length} hoạt động</strong>
            </div>
            <div className="stat">
              <span className="label">Số khoản chi phí</span>
              <strong>{report.costs.length} khoản chi</strong>
            </div>
            <div className="stat">
              <span className="label">Sản lượng dự kiến</span>
              <strong>{report.summary.expectedYield ? `${formatNumber(report.summary.expectedYield)} kg` : '—'}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
