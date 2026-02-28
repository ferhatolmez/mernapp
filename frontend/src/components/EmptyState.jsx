import React from 'react';

const EmptyState = ({ icon = '📭', title, description, action, onAction }) => (
    <div className="empty-state">
        <span className="empty-state-icon">{icon}</span>
        <h3 className="empty-state-subtitle">{title}</h3>
        <p className="empty-state-desc">{description}</p>
        {action && onAction && (
            <button className="btn btn-primary" onClick={onAction}>
                {action}
            </button>
        )}
    </div>
);

export default EmptyState;
