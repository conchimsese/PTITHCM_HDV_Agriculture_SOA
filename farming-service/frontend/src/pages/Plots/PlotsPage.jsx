import React, { useState } from 'react';
import { useFarming } from '../../contexts/FarmingContext';
import { plotsApi } from '../../services/farming.service';
import { formatNumber } from '../../utils/formatters';
import Icon from '../../components/common/Icon';
import Modal from '../../components/common/Modal';
import { useNavigate } from 'react-router-dom';

export function PlotsPage() {
  const { plots, refreshPlots, setSelectedPlotId } = useFarming();
  const navigate = useNavigate();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlot, setEditingPlot] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    area: '',
    location: '',
    description: '',
    latitude: 10.123,
    longitude: 105.456
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const openCreateModal = () => {
    setFormData({
      name: '',
      area: '',
      location: '',
      description: '',
      latitude: 10.123,
      longitude: 105.456
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const openEditModal = (plot, e) => {
    e.stopPropagation();
    setEditingPlot(plot);
    setFormData({
      name: plot.name,
      area: plot.area,
      location: plot.location,
      description: plot.description || '',
      latitude: plot.latitude || 10.123,
      longitude: plot.longitude || 105.456
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await plotsApi.createPlot({
        name: formData.name.trim(),
        area: Number(formData.area),
        location: formData.location.trim(),
        description: formData.description.trim() || null,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude)
      });
      setShowCreateModal(false);
      await refreshPlots();
    } catch (err) {
      setFormError(err.message || 'Lỗi khi tạo thửa ruộng');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingPlot) return;
    setSaving(true);
    setFormError(null);
    try {
      await plotsApi.updatePlot(editingPlot.plotId, {
        name: formData.name.trim(),
        area: Number(formData.area),
        location: formData.location.trim(),
        description: formData.description.trim() || null,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude)
      });
      setShowEditModal(false);
      await refreshPlots();
    } catch (err) {
      setFormError(err.message || 'Lỗi khi cập nhật thửa ruộng');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (plot, e) => {
    e.stopPropagation();
    const actionText = plot.isVisible ? 'ẩn' : 'hiển thị lại';
    if (!window.confirm(`Bà con có chắc muốn ${actionText} thửa ruộng "${plot.name}" không?`)) {
      return;
    }
    try {
      await plotsApi.updateVisibility(plot.plotId, !plot.isVisible);
      await refreshPlots();
    } catch (err) {
      alert(err.message || 'Lỗi khi thay đổi trạng thái ruộng');
    }
  };

  const handleSelectPlot = (plotId) => {
    setSelectedPlotId(plotId);
    navigate('/season');
  };

  return (
    <div className="content-width">
      <div className="page-head">
        <span className="kicker">Farming Service</span>
        <h1>Ruộng lúa của tôi</h1>
        <p>Mỗi ruộng có thể có nhiều mùa vụ. Chọn ruộng để xem chi tiết và tạo mùa vụ.</p>
      </div>

      <div className="card">
        <div className="card-row">
          <h2>Danh sách ruộng ({plots.length})</h2>
          <button className="btn primary" onClick={openCreateModal}>
            <Icon name="plus" size="sm" />
            <span>Thêm ruộng</span>
          </button>
        </div>
      </div>

      {plots.map((p) => (
        <div
          key={p.plotId}
          className={`listing-card ${!p.isVisible ? 'dimmed' : ''}`}
          onClick={() => handleSelectPlot(p.plotId)}
          role="button"
          tabIndex={0}
          style={{ cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: '12px' }}
        >
          <div className="row" style={{ alignItems: 'start' }}>
            <div className="mini-rice">
              <Icon name="field" size="xl" />
            </div>
            <div className="flex1">
              <div className="card-row">
                <div className="listing-title">{p.name}</div>
                <div>
                  <span className={`chip ${p.isVisible ? 'neutral' : 'warning'}`}>
                    {p.isVisible ? 'Đang hiển thị' : 'Đã ẩn'}
                  </span>
                </div>
              </div>

              <div className="listing-sub" style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '4px 0' }}>
                <Icon name="pin" size="sm" />
                <span>{p.location}</span>
                {p.latitude && p.longitude && (
                  <small style={{ color: 'var(--muted)', marginLeft: '8px' }}>
                    (GPS: {p.latitude.toFixed(3)}, {p.longitude.toFixed(3)})
                  </small>
                )}
              </div>

              <div className="listing-meta" style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                <span>
                  <Icon name="field" size="sm" />
                  <strong>{formatNumber(p.area)} m²</strong>
                </span>
                {p.description && (
                  <span style={{ color: 'var(--muted)' }}>{p.description}</span>
                )}
              </div>

              {/* Action buttons on card */}
              <div className="button-row" style={{ marginTop: '10px' }} onClick={(e) => e.stopPropagation()}>
                <button className="btn sm" onClick={(e) => openEditModal(p, e)}>
                  <Icon name="tune" size="sm" />
                  <span>Sửa thông tin</span>
                </button>
                <button className="btn sm ghost" onClick={(e) => handleToggleVisibility(p, e)}>
                  <Icon name="eye" size="sm" />
                  <span>{p.isVisible ? 'Ẩn ruộng' : 'Hiện ruộng'}</span>
                </button>
              </div>
            </div>
            <Icon name="chevron" />
          </div>
        </div>
      ))}

      {/* Modal Thêm ruộng mới */}
      <Modal
        title="Thêm ruộng lúa mới"
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      >
        <form onSubmit={handleCreateSubmit} className="stack-md">
          {formError && <div className="callout danger">{formError}</div>}
          <div className="field">
            <label htmlFor="name">Tên ruộng</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ví dụ: Ruộng Gò Cát, Ruộng Vàm Cỏ..."
              maxLength={100}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="area">Diện tích (m²)</label>
            <input
              id="area"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              placeholder="Ví dụ: 2500"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="location">Địa chỉ / Vị trí</label>
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ví dụ: Châu Thành, An Giang"
              maxLength={255}
              required
            />
          </div>
          <div className="two">
            <div className="field">
              <label htmlFor="latitude">Vĩ độ GPS (Latitude)</label>
              <input
                id="latitude"
                type="number"
                step="any"
                min="-90"
                max="90"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="longitude">Kinh độ GPS (Longitude)</label>
              <input
                id="longitude"
                type="number"
                step="any"
                min="-180"
                max="180"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="description">Ghi chú thêm</label>
            <textarea
              id="description"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Đất thịt nhẹ, gần kênh nội đồng..."
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setShowCreateModal(false)}>
              Hủy
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Tạo ruộng'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Sửa ruộng */}
      <Modal
        title={`Chỉnh sửa ruộng: ${editingPlot?.name}`}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      >
        <form onSubmit={handleEditSubmit} className="stack-md">
          {formError && <div className="callout danger">{formError}</div>}
          <div className="field">
            <label htmlFor="edit-name">Tên ruộng</label>
            <input
              id="edit-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={100}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="edit-area">Diện tích (m²)</label>
            <input
              id="edit-area"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="edit-location">Địa chỉ / Vị trí</label>
            <input
              id="edit-location"
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              maxLength={255}
              required
            />
          </div>
          <div className="two">
            <div className="field">
              <label htmlFor="edit-lat">Vĩ độ GPS</label>
              <input
                id="edit-lat"
                type="number"
                step="any"
                min="-90"
                max="90"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="edit-lng">Kinh độ GPS</label>
              <input
                id="edit-lng"
                type="number"
                step="any"
                min="-180"
                max="180"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="edit-desc">Ghi chú</label>
            <textarea
              id="edit-desc"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setShowEditModal(false)}>
              Hủy
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Đang cập nhật...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default PlotsPage;
