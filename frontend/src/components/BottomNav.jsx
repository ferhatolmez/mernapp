import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BottomNav = () => {
    const { isAdmin, isModerator } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const links = [
        { path: '/dashboard', icon: '🏠', label: 'Ana Sayfa' },
        { path: '/chat', icon: '💬', label: 'Chat' },
        { path: '/profile', icon: '👤', label: 'Profil' },
    ];

    if (isModerator) {
        links.push({ path: '/admin', icon: '⚙️', label: 'Yönetim' });
    }

    if (isAdmin) {
        links.push({ path: '/dashboard/admin', icon: '📊', label: 'Admin' });
    }

    return (
        <nav className="bottom-nav" id="bottom-nav">
            {links.map((link) => (
                <Link
                    key={link.path}
                    to={link.path}
                    className={`bottom-nav-item ${isActive(link.path) ? 'active' : ''}`}
                >
                    <span className="bottom-nav-icon">{link.icon}</span>
                    <span className="bottom-nav-label">{link.label}</span>
                </Link>
            ))}
        </nav>
    );
};

export default BottomNav;
