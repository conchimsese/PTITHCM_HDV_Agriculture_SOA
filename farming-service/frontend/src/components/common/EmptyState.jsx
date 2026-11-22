import React from 'react';
import Icon from './Icon';

export function EmptyState({ title, description, icon = 'sprout', actionLabel, onAction }) {
  return (
    <div className="card empty-seasons">
      <div className="empty-icon">
        <Icon name={icon} size="lg" />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {actionLabel && onAction && (
        <button className="btn primary" onClick={onAction}>
          <Icon name="plus" size="sm" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
