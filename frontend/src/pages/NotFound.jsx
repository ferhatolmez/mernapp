import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
    <div className="empty-state-page">
        <div className="empty-state">
            <span className="empty-state-icon">🔍</span>
            <h1 className="empty-state-title">404</h1>
            <p className="empty-state-subtitle">Sayfa Bulunamadı</p>
            <p className="empty-state-desc">
                Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.
            </p>
            <Link to="/dashboard" className="btn btn-primary">
                🏠 Ana Sayfaya Dön
            </Link>
        </div>
    </div>
);

export default NotFound;
