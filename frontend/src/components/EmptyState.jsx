import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({ icon: Icon = Inbox, title, description, action, onAction }) => (
    <div className="empty-state">
        <span className="empty-state-icon">
            {typeof Icon === 'string' ? Icon : <Icon size={48} />}
        </span>
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
