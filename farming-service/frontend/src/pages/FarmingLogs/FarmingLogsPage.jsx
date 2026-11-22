import React, { useState, useEffect, useCallback } from 'react';
import { useFarming } from '../../contexts/FarmingContext';
import { farmingLogsApi, reportsApi } from '../../services/farming.service';
import { formatDate, formatNumber, WORK_TYPES } from '../../utils/formatters';
import Icon from '../../components/common/Icon';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';

export function FarmingLogsPage() {
  const { currentPlot, currentSeason } = useFarming();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    workType: 'FERTILIZING',
    workDate: new Date().toISOString().split('T')[0],
    description: '',
    quantity: '',
    unit: 'kg'
  });

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadLogs = useCallback(async () => {
    if (!currentSeason) {
      setLogs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const report = await reportsApi.getReport(currentSeason.cropSeasonId);
      setLogs(report.farmingLogs || []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách nhật ký');
    } finally {
      setLoading(false);
    }
  }, [currentSeason]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const openCreateModal = () => {
    setFormData({
      workType: 'FERTILIZING',
      workDate: new Date().toISOString().split('T')[0],
      description: '',
      quantity: '',
      unit: 'kg'
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const openEditModal = (log) => {
    setEditingLog(log);
    setFormData({
      workType: log.workType,
      workDate: log.workDate,
      description: log.description || '',
      quantity: log.quantity !== null ? log.quantity : '',
      unit: log.unit || 'kg'
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!currentSeason) return;
    setSaving(true);
    setFormError(null);
    try {
      await farmingLogsApi.createLog(currentSeason.cropSeasonId, {
        workType: formData.workType,
        workDate: formData.workDate,
        description: formData.description.trim() || null,
        quantity: formData.quantity ? Number(formData.quantity) : null,
        unit: formData.unit.trim() || null
      });
      setShowCreateModal(false);
      await loadLogs();
    } catch (err) {
      setFormError(err.message || 'Lỗi khi ghi nhật ký');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingLog) return;
    setSaving(true);
    setFormError(null);
    try {
      await farmingLogsApi.updateLog(editingLog.logId, {
        workType: formData.workType,
        workDate: formData.workDate,
        description: formData.description.trim() ? formData.description.trim() : null, // null to clear description per Section 6.11
        quantity: formData.quantity ? Number(formData.quantity) : undefined,
        unit: formData.unit.trim() ? formData.unit.trim() : undefined
      });
      setShowEditModal(false);
      await loadLogs();
    } catch (err) {
      setFormError(err.message || 'Lỗi khi cập nhật nhật ký');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVisibility = async (log) => {
    if (!window.confirm('Bà con có chắc muốn ẩn nhật ký này không?')) return;
    try {
      await farmingLogsApi.updateVisibility(log.logId, false);
      await loadLogs();
    } catch (err) {
      alert(err.message || 'Lỗi khi ẩn nhật ký');
    }
  };

  if (!currentSeason) {
    return (
      <div className="content-width">
        <EmptyState
          title="Chưa có mùa vụ để ghi nhật ký"
          description="Bà con vui lòng chọn hoặc tạo một mùa vụ canh tác để bắt đầu ghi nhật ký đồng ruộng."
          icon="book"
          actionLabel="Đến quản lý mùa vụ"
          onAction={() => window.location.href = '/season'}
        />
      </div>
    );
  }

  return (
    <div className="content-width">
      <div className="page-head">
        <span className="kicker">Farming · Nhật ký đồng ruộng</span>
        <h1>Nhật ký canh tác</h1>
        <p>{currentPlot?.name} · {currentSeason.seasonName} · Giống {currentSeason.cropType}</p>
      </div>

      <div className="card">
        <div className="card-row">
          <div>
            <h2>Công việc đã ghi ({logs.length})</h2>
            <div className="help">Nhật ký được sắp xếp theo thời gian thực hiện trên đồng ruộng.</div>
          </div>
          <button className="btn primary" onClick={openCreateModal}>
            <Icon name="plus" size="sm" />
            <span>Ghi công việc</span>
          </button>
        </div>
      </div>

      {loading && <div className="card loading-state">Đang tải nhật ký...</div>}
      {error && <div className="callout danger">{error}</div>}

      {!loading && logs.length === 0 ? (
        <EmptyState
          title="Chưa có nhật ký canh tác"
          description="Chưa có công việc nào được ghi nhận cho mùa vụ này. Hãy ghi lại công việc đầu tiên như làm đất, gieo sạ, bón phân..."
          icon="book"
          actionLabel="Ghi việc đã làm"
          onAction={openCreateModal}
        />
      ) : (
        <div className="card">
          <div className="timeline" style={{ marginTop: '8px' }}>
            {logs.map((l) => (
              <div key={l.logId} className="time-item">
                <div className="card-row">
                  <div>
                    <span className="chip neutral" style={{ marginRight: '8px' }}>
                      {formatDate(l.workDate)}
                    </span>
                    <strong>{WORK_TYPES[l.workType] || l.workType}</strong>
                  </div>
                  <div className="button-row">
                    <button className="linkish" onClick={() => openEditModal(l)}>
                      <Icon name="tune" size="sm" />
                      <span>Sửa</span>
                    </button>
                    <button className="linkish text-danger" onClick={() => handleToggleVisibility(l)}>
                      <Icon name="eye" size="sm" />
                      <span>Ẩn</span>
                    </button>
                  </div>
                </div>

                {l.description && (
                  <p style={{ margin: '6px 0 2px 0', color: 'var(--body)' }}>
                    {l.description}
                  </p>
                )}

                {l.quantity !== null && (
                  <small style={{ color: 'var(--muted)' }}>
                    Vật tư: {formatNumber(l.quantity)} {l.unit || ''}
                  </small>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Thêm Nhật ký */}
      <Modal
        title="Ghi công việc canh tác mới"
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      >
        <form onSubmit={handleCreateSubmit} className="stack-md">
          {formError && <div className="callout danger">{formError}</div>}
          <div className="field">
            <label htmlFor="workType">Loại công việc (Allowlist chuẩn)</label>
            <select
              id="workType"
              value={formData.workType}
              onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
              required
            >
              {Object.entries(WORK_TYPES).map(([val, label]) => (
                <option key={val} value={val}>{label} ({val})</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="workDate">Ngày thực hiện</label>
            <input
              id="workDate"
              type="date"
              value={formData.workDate}
              onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="description">Mô tả công việc</label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ví dụ: Bón phân đợt 1 (Urea + NPK), mực nước ruộng 3cm..."
              maxLength={2000}
            />
          </div>
          <div className="two">
            <div className="field">
              <label htmlFor="quantity">Số lượng vật tư (nếu có)</label>
              <input
                id="quantity"
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="Ví dụ: 50"
              />
            </div>
            <div className="field">
              <label htmlFor="unit">Đơn vị tính</label>
              <input
                id="unit"
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="kg, lít, bao..."
                maxLength={20}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setShowCreateModal(false)}>
              Hủy
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu công việc'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Sửa Nhật ký */}
      <Modal
        title="Chỉnh sửa nhật ký công việc"
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      >
        <form onSubmit={handleEditSubmit} className="stack-md">
          {formError && <div className="callout danger">{formError}</div>}
          <div className="field">
            <label htmlFor="edit-workType">Loại công việc</label>
            <select
              id="edit-workType"
              value={formData.workType}
              onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
              required
            >
              {Object.entries(WORK_TYPES).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="edit-workDate">Ngày thực hiện</label>
            <input
              id="edit-workDate"
              type="date"
              value={formData.workDate}
              onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="edit-description">Mô tả chi tiết</label>
            <textarea
              id="edit-description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Để trống nếu muốn xóa mô tả..."
              maxLength={2000}
            />
          </div>
          <div className="two">
            <div className="field">
              <label htmlFor="edit-quantity">Số lượng vật tư</label>
              <input
                id="edit-quantity"
                type="number"
                step="0.01"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="edit-unit">Đơn vị</label>
              <input
                id="edit-unit"
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                maxLength={20}
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
    </div>
  );
}

export default FarmingLogsPage;
