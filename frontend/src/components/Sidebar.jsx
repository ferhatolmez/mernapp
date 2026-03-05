import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Zap,
    Home,
    MessageSquare,
    User,
    Users,
    BarChart3,
    X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
    const { user, isAdmin, isModerator } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const links = [
        { path: '/dashboard', icon: <Home size={20} />, label: 'Dashboard' },
        { path: '/chat', icon: <MessageSquare size={20} />, label: 'Chat' },
        { path: '/profile', icon: <User size={20} />, label: 'Profilim' },
    ];

    if (isModerator) {
        links.push({ path: '/admin', icon: <Users size={20} />, label: 'Kullanıcılar' });
    }

    if (isAdmin) {
        links.push({ path: '/dashboard/admin', icon: <BarChart3 size={20} />, label: 'Admin Dashboard' });
    }

    return (
        <>
            {/* Overlay */}
            {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

            {/* Sidebar */}
            <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <span className="brand-icon"><Zap size={24} fill="currentColor" /></span>
                    <span className="brand-name">MERN App</span>
                    <button className="sidebar-close" onClick={onClose}><X size={24} /></button>
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
