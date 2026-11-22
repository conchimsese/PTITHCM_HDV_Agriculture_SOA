import React, { useState } from 'react';
import { useFarming } from '../../contexts/FarmingContext';
import { costsApi } from '../../services/farming.service';
import PlotSeasonSwitcher from '../../components/common/PlotSeasonSwitcher';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import Icon from '../../components/common/Icon';
import { formatCurrency, formatDateInput, formatDateVN } from '../../utils/formatters';

export default function CostsPage() {
  const { activeSeason, reportData, loadingReport, refreshReport } = useFarming();
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [editingCost, setEditingCost] = useState(null);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    incurredDate: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const costs = reportData?.costs || [];
  const totalCost = reportData?.summary?.totalCost || 0;

  const openCreateModal = () => {
    setErrorMsg('');
    setFormData({
      category: '',
      amount: '',
      incurredDate: new Date().toISOString().split('T')[0],
      description: '',
    });
    setModalMode('create');
  };

  const openEditModal = (cost) => {
    setErrorMsg('');
    setEditingCost(cost);
    setFormData({
      category: cost.category || '',
      amount: cost.amount || '',
      incurredDate: formatDateInput(cost.incurredDate) || new Date().toISOString().split('T')[0],
      description: cost.description || '',
    });
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingCost(null);
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category.trim()) {
      setErrorMsg('Vui lòng nhập hạng mục chi phí');
      return;
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Vui lòng nhập số tiền chi phí hợp lệ (> 0)');
      return;
    }
    if (!formData.incurredDate) {
      setErrorMsg('Vui lòng chọn ngày chi');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const payload = {
        category: formData.category.trim(),
        amount: amt,
        incurredDate: formData.incurredDate,
        description: formData.description.trim() ? formData.description.trim() : null,
      };

      if (modalMode === 'create') {
        await costsApi.createCost(activeSeason.cropSeasonId, payload);
        setActionSuccess('Đã thêm khoản chi phí thành công!');
      } else if (modalMode === 'edit') {
        await costsApi.updateCost(editingCost.costId, payload);
        setActionSuccess('Đã cập nhật chi phí thành công!');
      }

      closeModal();
      await refreshReport();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Không thể lưu chi phí. Vui lòng kiểm tra lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleHide = async (cost) => {
    const actionLabel = cost.isVisible === false ? 'hiện lại' : 'ẩn';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionLabel} khoản chi phí "${cost.category}"?`)) {
      return;
    }
    try {
      if (cost.isVisible === false) {
        await costsApi.unhideCost(cost.costId);
        setActionSuccess('Đã hiện lại khoản chi phí!');
      } else {
        await costsApi.hideCost(cost.costId);
        setActionSuccess('Đã ẩn khoản chi phí thành công!');
      }
      await refreshReport();
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err) {
      alert(err.message || 'Thao tác không thành công');
    }
  };

  return (
    <div className="costs-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--brand-green, #164735)' }}>
            Quản Lý Chi Phí Canh Tác
          </h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary, #617D71)', fontSize: '0.9rem' }}>
            Theo dõi tất cả chi tiêu vật tư, nhân công, dịch vụ theo từng mùa vụ
          </p>
        </div>
        {activeSeason && (
          <button
            className="btn btn-primary"
            onClick={openCreateModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Icon name="plus" size={16} /> Thêm Chi Phí
          </button>
        )}
      </div>

      <PlotSeasonSwitcher />

      {actionSuccess && (
        <div style={{
          backgroundColor: '#e6f4ea',
          color: '#137333',
          padding: '10px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.9rem'
        }}>
          <Icon name="check" size={16} /> {actionSuccess}
        </div>
      )}

      {!activeSeason ? (
        <EmptyState
          title="Chưa chọn mùa vụ"
          description="Vui lòng chọn ruộng và mùa vụ ở thanh trên hoặc tạo mùa vụ mới để quản lý chi phí."
          actionText="Đi đến Mùa Vụ"
          actionUrl="/season"
        />
      ) : loadingReport ? (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#617D71' }}>
          Đang tải dữ liệu chi phí mùa vụ...
        </div>
      ) : (
        <>
          {/* Hero Total Card */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, #164735 0%, #246B45 100%)',
            color: '#fff',
            padding: '24px',
            marginBottom: '24px',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.85 }}>
                Tổng Chi Phí Mùa Vụ: {activeSeason.seasonName}
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 700, marginTop: '4px', color: '#FCD34D' }}>
                {formatCurrency(totalCost)}
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '4px' }}>
                Số khoản chi phí đã ghi nhận: {costs.length}
              </div>
            </div>
            <button
              onClick={openCreateModal}
              className="btn"
              style={{
                backgroundColor: '#ffffff',
                color: '#164735',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Icon name="plus" size={16} /> Ghi Thêm Chi Phí
            </button>
          </div>

          {/* Costs Table / Card list */}
          {costs.length === 0 ? (
            <EmptyState
              title="Chưa có khoản chi phí nào"
              description="Mùa vụ này chưa ghi nhận chi phí nào (giống, phân bón, thuốc BVTV, máy cày, gặt,...)."
              actionText="+ Ghi Khoản Chi Phí Đầu Tiên"
              onAction={openCreateModal}
            />
          ) : (
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #E5E9E2)', fontWeight: 600 }}>
                Chi tiết các khoản chi
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-subtle, #F8FAF7)', color: 'var(--text-secondary, #617D71)', borderBottom: '1px solid var(--border-color, #E5E9E2)' }}>
                      <th style={{ padding: '12px 16px' }}>Hạng Mục</th>
                      <th style={{ padding: '12px 16px' }}>Ngày Chi</th>
                      <th style={{ padding: '12px 16px' }}>Mô Tả / Ghi Chú</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Số Tiền (VNĐ)</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right' }}>Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {costs.map((cost) => (
                      <tr
                        key={cost.costId}
                        style={{
                          borderBottom: '1px solid var(--border-color, #E5E9E2)',
                          opacity: cost.isVisible === false ? 0.6 : 1,
                          backgroundColor: cost.isVisible === false ? '#FAFAFA' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary, #1A2E26)' }}>
                          {cost.category}
                          {cost.isVisible === false && (
                            <span style={{ marginLeft: '8px', fontSize: '0.75rem', padding: '2px 6px', background: '#F1F3F4', borderRadius: '4px', color: '#5F6368' }}>
                              Đã ẩn
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #617D71)' }}>
                          {formatDateVN(cost.incurredDate)}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary, #617D71)', maxWidth: '280px' }}>
                          {cost.description || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: '#164735' }}>
                          {formatCurrency(cost.amount)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            className="btn btn-outline"
                            onClick={() => openEditModal(cost)}
                            style={{ padding: '4px 10px', fontSize: '0.8rem', marginRight: '6px' }}
                          >
                            Sửa
                          </button>
                          <button
                            className="btn"
                            onClick={() => handleToggleHide(cost)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.8rem',
                              backgroundColor: cost.isVisible === false ? '#E6F4EA' : '#FCE8E6',
                              color: cost.isVisible === false ? '#137333' : '#C5221F',
                            }}
                          >
                            {cost.isVisible === false ? 'Hiện lại' : 'Ẩn'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg-subtle, #F8FAF7)', fontWeight: 700 }}>
                      <td colSpan="3" style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--brand-green, #164735)' }}>
                        Tổng cộng:
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: 'var(--brand-green, #164735)', fontSize: '1.05rem' }}>
                        {formatCurrency(totalCost)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Add/Edit Cost */}
      {modalMode && (
        <Modal
          title={modalMode === 'create' ? 'Ghi Khoản Chi Phí Mới' : 'Cập Nhật Chi Phí'}
          onClose={closeModal}
        >
          {errorMsg && (
            <div style={{ backgroundColor: '#FCE8E6', color: '#C5221F', padding: '10px 14px', borderRadius: '6px', marginBottom: '14px', fontSize: '0.85rem' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Hạng Mục Chi Phí <span style={{ color: '#D93025' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Phân bón đợt 1, Giống ST25, Công cấy, Thuốc BVTV..."
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #E5E9E2)', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                  Số Tiền (VNĐ) <span style={{ color: '#D93025' }}>*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="VD: 1500000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #E5E9E2)', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                  Ngày Chi <span style={{ color: '#D93025' }}>*</span>
                </label>
                <input
                  type="date"
                  value={formData.incurredDate}
                  onChange={(e) => setFormData({ ...formData, incurredDate: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #E5E9E2)', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                Ghi Chú Thêm
              </label>
              <textarea
                rows="3"
                placeholder="VD: Mua 3 bao phân NPK 20-20-15 tại đại lý Ba Sương..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color, #E5E9E2)', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={closeModal}
                disabled={submitting}
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Đang lưu...' : (modalMode === 'create' ? 'Thêm Chi Phí' : 'Lưu Thay Đổi')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
