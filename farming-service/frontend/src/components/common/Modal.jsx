import React from 'react';
import Icon from './Icon';

export function Modal({ title, isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="modal-root">
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button className="icon-text close-btn" onClick={onClose} aria-label="Đóng">
            <Icon name="x" size="sm" />
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
