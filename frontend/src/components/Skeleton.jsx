import React from 'react';

// Tek satır skeleton
export const SkeletonLine = ({ width = '100%', height = '14px', className = '' }) => (
  <div className={`skeleton ${className}`} style={{ width, height, borderRadius: '6px' }} />
);

// Kart skeleton
export const SkeletonCard = () => (
  <div className="card skeleton-card">
    <div className="skeleton-card-header">
      <div className="skeleton skeleton-avatar" />
      <div className="skeleton-lines">
        <SkeletonLine width="60%" height="16px" />
        <SkeletonLine width="40%" height="12px" />
      </div>
    </div>
    <SkeletonLine width="100%" height="12px" />
    <SkeletonLine width="85%" height="12px" />
    <SkeletonLine width="70%" height="12px" />
  </div>
);

// Tablo satırı skeleton
export const SkeletonTableRow = () => (
  <tr className="skeleton-row">
    {[40, 160, 80, 60, 80, 80].map((w, i) => (
      <td key={i}>
        <div className="skeleton" style={{ width: w, height: 14, borderRadius: 4 }} />
      </td>
    ))}
  </tr>
);

// Stat kutusu skeleton
export const SkeletonStat = () => (
  <div className="stat-card skeleton-stat">
    <SkeletonLine width="40px" height="40px" className="skeleton-icon" />
    <div>
      <SkeletonLine width="70px" height="28px" />
      <SkeletonLine width="90px" height="12px" />
    </div>
  </div>
);

// Profil skeleton
export const SkeletonProfile = () => (
  <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
    <div className="skeleton" style={{ width: 100, height: 100, borderRadius: '50%' }} />
    <SkeletonLine width="120px" height="20px" />
    <SkeletonLine width="160px" height="14px" />
    <SkeletonLine width="60px" height="24px" />
  </div>
);
