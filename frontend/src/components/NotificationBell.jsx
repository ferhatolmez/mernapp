import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

const ICONS = {
    message: '💬',
    system: '⚙️',
    mention: '@',
    welcome: '🎉',
    role_change: '👑',
    login: '🔑',
    security: '🔐',
};

const NotificationBell = () => {
    const {
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Dışarı tıklanınca kapat
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatTime = (date) => {
        const now = new Date();
        const diff = now - new Date(date);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Az önce';
        if (minutes < 60) return `${minutes}dk`;
        if (hours < 24) return `${hours}sa`;
        return `${days}g`;
    };

    return (
        <div className="notification-bell" ref={dropdownRef}>
            <button
                className="notification-bell-btn"
                onClick={() => setIsOpen(!isOpen)}
                title="Bildirimler"
            >
                🔔
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-dropdown-header">
                        <h4>Bildirimler</h4>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="btn-text">
                                Tümünü oku
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="notification-empty">
                                <span>🔕</span>
                                <p>Bildirim yok</p>
                            </div>
                        ) : (
                            notifications.slice(0, 10).map((n) => (
                                <div
                                    key={n._id}
                                    className={`notification-item ${!n.isRead ? 'unread' : ''}`}
                                    onClick={() => {
                                        if (!n.isRead) markAsRead(n._id);
                                    }}
                                >
                                    <span className="notification-icon">{ICONS[n.type] || '📋'}</span>
                                    <div className="notification-content">
                                        <p className="notification-title">{n.title}</p>
                                        <p className="notification-message">{n.message}</p>
                                        <span className="notification-time">{formatTime(n.createdAt)}</span>
                                    </div>
                                    <button
                                        className="notification-delete"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteNotification(n._id);
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
