import React from 'react';

const RateLimitIndicator = ({ remaining, limit }) => {
    if (remaining === null || limit === null) return null;

    const percentage = (remaining / limit) * 100;
    let color = 'var(--color-success)';
    if (percentage < 30) color = 'var(--color-error)';
    else if (percentage < 60) color = 'var(--color-warning)';

    return (
        <div className="rate-limit-indicator" title={`API İstek Limiti: ${remaining}/${limit}`}>
            <div className="rate-limit-bar">
                <div
                    className="rate-limit-fill"
                    style={{ width: `${percentage}%`, backgroundColor: color }}
                />
            </div>
            <span className="rate-limit-text">{remaining}/{limit}</span>
        </div>
    );
};

export default RateLimitIndicator;
