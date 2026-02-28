import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, isAdmin, isModerator } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const links = [
        { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
        { path: '/chat', icon: '💬', label: 'Chat' },
        { path: '/profile', icon: '👤', label: 'Profilim' },
    ];

    if (isModerator) {
        links.push({ path: '/admin', icon: '⚙️', label: 'Kullanıcılar' });
    }

    if (isAdmin) {
        links.push({ path: '/dashboard/admin', icon: '📊', label: 'Admin Dashboard' });
    }

    return (
        <>
            {/* Overlay */}
            {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

            {/* Sidebar */}
            <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <span className="brand-icon">⚡</span>
                    <span className="brand-name">MERN App</span>
                    <button className="sidebar-close" onClick={onClose}>✕</button>
                </div>

                <nav className="sidebar-nav">
                    {links.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`sidebar-link ${isActive(link.path) ? 'active' : ''}`}
                            onClick={onClose}
                        >
                            <span className="sidebar-icon">{link.icon}</span>
                            <span className="sidebar-label">{link.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <img src={user?.avatar} alt={user?.name} className="user-avatar-sm" />
                        <div>
                            <span className="user-name">{user?.name}</span>
                            <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
