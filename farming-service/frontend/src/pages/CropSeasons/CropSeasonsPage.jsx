import React, { useState } from 'react';
import { useFarming } from '../../contexts/FarmingContext';
import { cropSeasonsApi } from '../../services/farming.service';
import { formatNumber, formatDate } from '../../utils/formatters';
import Icon from '../../components/common/Icon';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { NavLink } from 'react-router-dom';

export function CropSeasonsPage() {
  const { currentPlot, currentSeason, currentPlotSeasons, registerSeason, selectedPlotId } = useFarming();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    seasonName: '',
    startDate: new Date().toISOString().split('T')[0],
    expectedYield: '',
    cropType: 'ST25'
  });

  const [actualYield, setActualYield] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const openCreateModal = () => {
    setFormData({
      seasonName: 'Đông Xuân 2026',
      startDate: new Date().toISOString().split('T')[0],
      expectedYield: '1500',
      cropType: 'ST25'
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const openEditModal = () => {
    if (!currentSeason) return;
    setFormData({
      seasonName: currentSeason.seasonName,
      startDate: currentSeason.startDate,
      expectedYield: currentSeason.expectedYield || '',
      cropType: currentSeason.cropType
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const openCompleteModal = () => {
    setActualYield(currentSeason?.expectedYield || '');
    setFormError(null);
    setShowCompleteModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPlotId) return;
    setSaving(true);
    setFormError(null);
    try {
      const newSeason = await cropSeasonsApi.createCropSeason(selectedPlotId, {
        seasonName: formData.seasonName.trim(),
        startDate: formData.startDate,
        expectedYield: formData.expectedYield ? Number(formData.expectedYield) : null,
        cropType: formData.cropType.trim()
      });
      registerSeason(selectedPlotId, newSeason);
      setShowCreateModal(false);
    } catch (err) {
      setFormError(err.message || 'Lỗi khi tạo mùa vụ mới');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!currentSeason) return;
    setSaving(true);
    setFormError(null);
    try {
      const updated = await cropSeasonsApi.updateCropSeason(currentSeason.cropSeasonId, {
        seasonName: formData.seasonName.trim(),
        startDate: formData.startDate,
        expectedYield: formData.expectedYield ? Number(formData.expectedYield) : null,
        cropType: formData.cropType.trim()
      });
      registerSeason(selectedPlotId, { ...currentSeason, ...updated });
      setShowEditModal(false);
    } catch (err) {
      setFormError(err.message || 'Lỗi khi cập nhật mùa vụ');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteSubmit = async (e) => {
    e.preventDefault();
    if (!currentSeason) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await cropSeasonsApi.completeCropSeason(currentSeason.cropSeasonId, actualYield);
      registerSeason(selectedPlotId, {
        ...currentSeason,
        status: res.status,
        actualYield: res.actualYield
      });
      setShowCompleteModal(false);
    } catch (err) {
      setFormError(err.message || 'Lỗi khi hoàn thành mùa vụ');
    } finally {
      setSaving(false);
    }
  };

  if (!currentPlot) {
    return (
      <div className="content-width">
        <EmptyState
          title="Chưa chọn thửa ruộng"
          description="Bà con vui lòng chọn một thửa ruộng hoặc thêm thửa ruộng mới để quản lý mùa vụ."
          icon="field"
          actionLabel="Đến danh sách ruộng"
          onAction={() => window.location.href = '/plots'}
        />
      </div>
    );
  }

  return (
    <div className="content-width">
      <div className="card-row" style={{ marginBottom: '12px' }}>
        <NavLink to="/plots" className="breadcrumb">
          <Icon name="back" size="sm" />
          <span>Tất cả ruộng</span>
        </NavLink>
      </div>

      <div className="page-head">
        <span className="kicker">Ruộng & Mùa vụ</span>
        <h1>{currentPlot.name}</h1>
        <p>{currentPlot.location} · {formatNumber(currentPlot.area)} m²</p>
      </div>

      {/* Season Selection & Actions */}
      <div className="card">
        <div className="card-row">
          <h2>Mùa vụ của ruộng</h2>
          <button className="btn primary sm" onClick={openCreateModal}>
            <Icon name="plus" size="sm" />
            <span>Thêm mùa vụ</span>
          </button>
        </div>

        {currentPlotSeasons.length > 0 ? (
          <div className="tabs" style={{ marginTop: '12px' }}>
            {currentPlotSeasons.map((s) => (
              <button
                key={s.cropSeasonId}
                className={currentSeason?.cropSeasonId === s.cropSeasonId ? 'active' : ''}
                onClick={() => registerSeason(selectedPlotId, s)}
              >
                {s.seasonName}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: '16px' }}>
            <EmptyState
              title="Thửa ruộng chưa có mùa vụ nào"
              description="Bà con cần tạo mùa vụ đầu tiên để bắt đầu ghi chép nhật ký, tính toán chi phí và theo dõi tiến độ."
              icon="sprout"
              actionLabel="Tạo mùa vụ đầu tiên"
              onAction={openCreateModal}
            />
          </div>
        )}
      </div>

      {/* Current Season Details */}
      {currentSeason && (
        <div className="card">
          <div className="card-row">
            <div>
              <span className="kicker">
                Giống lúa {currentSeason.cropType} · Bắt đầu ngày {formatDate(currentSeason.startDate)}
              </span>
              <h2 style={{ marginTop: '6px' }}>{currentSeason.seasonName}</h2>
            </div>
            <div>
              <span className={`chip ${currentSeason.status === 'COMPLETED' ? 'success' : 'neutral'}`}>
                {currentSeason.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đang canh tác'}
              </span>
            </div>
          </div>

          <div className="stats" style={{ marginTop: '16px' }}>
            <div className="stat">
              <span className="label">Giống lúa</span>
              <strong style={{ color: 'var(--brand-900)' }}>{currentSeason.cropType}</strong>
            </div>
            <div className="stat">
              <span className="label">Sản lượng kỳ vọng</span>
              <strong>{currentSeason.expectedYield ? `${formatNumber(currentSeason.expectedYield)} kg` : 'Chưa nhập'}</strong>
            </div>
            <div className="stat">
              <span className="label">Sản lượng thực tế</span>
              <strong>{currentSeason.actualYield ? `${formatNumber(currentSeason.actualYield)} kg` : 'Chưa thu hoạch'}</strong>
            </div>
            <div className="stat">
              <span className="label">Ngày kết thúc</span>
              <strong>{currentSeason.endDate ? formatDate(currentSeason.endDate) : 'Đang canh tác'}</strong>
            </div>
          </div>

          <div className="button-row" style={{ marginTop: '16px' }}>
            <button className="btn sm" onClick={openEditModal}>
              <Icon name="tune" size="sm" />
              <span>Chỉnh sửa mùa vụ</span>
            </button>
            {currentSeason.status !== 'COMPLETED' && (
              <button className="btn sm primary" onClick={openCompleteModal}>
                <Icon name="check" size="sm" />
                <span>Hoàn thành mùa vụ</span>
              </button>
            )}
            <NavLink to="/journal" className="btn sm ghost">
              <Icon name="book" size="sm" />
              <span>Nhật ký canh tác</span>
            </NavLink>
            <NavLink to="/costs" className="btn sm ghost">
              <Icon name="wallet" size="sm" />
              <span>Chi phí vụ mùa</span>
            </NavLink>
          </div>
        </div>
      )}

      {/* Modal Thêm mùa vụ mới */}
      <Modal
        title={`Thêm mùa vụ cho ruộng: ${currentPlot.name}`}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      >
        <form onSubmit={handleCreateSubmit} className="stack-md">
          {formError && <div className="callout danger">{formError}</div>}
          <div className="field">
            <label htmlFor="seasonName">Tên mùa vụ</label>
            <input
              id="seasonName"
              type="text"
              value={formData.seasonName}
              onChange={(e) => setFormData({ ...formData, seasonName: e.target.value })}
              placeholder="Ví dụ: Đông Xuân 2026–2027"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="cropType">Giống lúa (Bắt buộc)</label>
            <input
              id="cropType"
              type="text"
              value={formData.cropType}
              onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
              placeholder="Ví dụ: ST25, OM18, Đài Thơm 8, IR50404..."
              required
            />
          </div>
          <div className="two">
            <div className="field">
              <label htmlFor="startDate">Ngày xuống giống / bắt đầu</label>
              <input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="expectedYield">Sản lượng dự kiến (kg)</label>
              <input
                id="expectedYield"
                type="number"
                step="0.01"
                min="0"
                value={formData.expectedYield}
                onChange={(e) => setFormData({ ...formData, expectedYield: e.target.value })}
                placeholder="Ví dụ: 1500"
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setShowCreateModal(false)}>
              Hủy
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Đang tạo...' : 'Tạo mùa vụ'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Chỉnh sửa mùa vụ */}
      <Modal
        title="Chỉnh sửa thông tin mùa vụ"
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      >
        <form onSubmit={handleEditSubmit} className="stack-md">
          {formError && <div className="callout danger">{formError}</div>}
          <div className="field">
            <label htmlFor="edit-seasonName">Tên mùa vụ</label>
            <input
              id="edit-seasonName"
              type="text"
              value={formData.seasonName}
              onChange={(e) => setFormData({ ...formData, seasonName: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="edit-cropType">Giống lúa (Không được để trống)</label>
            <input
              id="edit-cropType"
              type="text"
              value={formData.cropType}
              onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
              required
            />
          </div>
          <div className="two">
            <div className="field">
              <label htmlFor="edit-startDate">Ngày bắt đầu</label>
              <input
                id="edit-startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="edit-expectedYield">Sản lượng dự kiến (kg)</label>
              <input
                id="edit-expectedYield"
                type="number"
                step="0.01"
                min="0"
                value={formData.expectedYield}
                onChange={(e) => setFormData({ ...formData, expectedYield: e.target.value })}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setShowEditModal(false)}>
              Hủy
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu chỉnh sửa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Hoàn thành mùa vụ */}
      <Modal
        title="Hoàn thành mùa vụ thu hoạch"
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
      >
        <form onSubmit={handleCompleteSubmit} className="stack-md">
          {formError && <div className="callout danger">{formError}</div>}
          <p>
            Mùa vụ <strong>{currentSeason?.seasonName}</strong> sẽ được chuyển trạng thái sang <strong>COMPLETED</strong>.
            Xin bà con nhập sản lượng thu hoạch thực tế (tính theo kg).
          </p>
          <div className="field">
            <label htmlFor="actualYield">Sản lượng thực tế thu hoạch (kg)</label>
            <input
              id="actualYield"
              type="number"
              step="0.01"
              min="0"
              value={actualYield}
              onChange={(e) => setActualYield(e.target.value)}
              placeholder="Ví dụ: 1420"
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setShowCompleteModal(false)}>
              Hủy
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Xác nhận hoàn thành'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default CropSeasonsPage;
