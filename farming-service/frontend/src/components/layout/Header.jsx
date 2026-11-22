import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Icon from '../common/Icon';
import Modal from '../common/Modal';

export function Header() {
  const { user, token, updateToken } = useAuth();
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState(token);

  const handleSaveToken = (e) => {
    e.preventDefault();
    updateToken(tokenInput.trim());
    setShowTokenModal(false);
  };

  return (
    <>
      <header className="app-header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-leaf">
              <Icon name="sprout" size="sm" />
            </span>
            <div className="brand-text">
              <strong>Ruộng Lúa Việt</strong>
              <small>Farming Microservice</small>
            </div>
          </div>

          <div className="header-right">
            <div className="role-badge">
              <span className="status-dot"></span>
              <strong>{user?.role || 'FARMER'}</strong>
            </div>

            <button
              className="btn sm ghost"
              onClick={() => setShowTokenModal(true)}
              title="Cấu hình Token JWT"
            >
              <Icon name="lock" size="sm" />
              <span>Khóa JWT</span>
            </button>
          </div>
        </div>
      </header>

      <Modal
        title="Cấu hình Token Xác thực (JWT RS256)"
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
      >
        <form onSubmit={handleSaveToken} className="stack-md">
          <p className="help">
            Frontend gửi token này qua header <code>Authorization: Bearer &lt;token&gt;</code> sang Backend Farming Service (cổng 8082).
          </p>
          <div className="field">
            <label htmlFor="jwt-token">Mã Bearer JWT Token</label>
            <textarea
              id="jwt-token"
              rows={5}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Dán token JWT RS256 vào đây..."
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setShowTokenModal(false)}>
              Đóng
            </button>
            <button type="submit" className="btn primary">
              Lưu Token
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default Header;
