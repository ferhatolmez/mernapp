import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  BellOff,
  MessageSquare,
  Settings,
  AtSign,
  PartyPopper,
  Crown,
  Key,
  Lock,
  X,
  ClipboardList,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const ICONS = {
  message: <MessageSquare size={16} />,
  system: <Settings size={16} />,
  mention: <AtSign size={16} />,
  welcome: <PartyPopper size={16} />,
  role_change: <Crown size={16} />,
  login: <Key size={16} />,
  security: <Lock size={16} />,
};

const NotificationBell = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const formatTime = (date) => {
    const diff = Math.max(0, Date.now() - new Date(date).getTime());
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Az once';
    if (minutes < 60) return `${minutes} dk`;
    if (hours < 24) return `${hours} sa`;
    return `${days} g`;
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Bildirimler"
        aria-label="Bildirimleri ac"
      >
        <Bell size={20} />
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
                Tumunu oku
              </button>
            )}
          </div>

          <div className="notification-list">
            {isLoading ? (
              <div className="notification-empty">
                <p>Yukleniyor...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <BellOff size={32} className="text-muted" />
                <p>Bildirim yok</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                  onClick={() => {
                    if (!notification.isRead) {
                      markAsRead(notification._id);
                    }
                  }}
                >
                  <span className="notification-icon">
                    {ICONS[notification.type] || <ClipboardList size={16} />}
                  </span>

                  <div className="notification-content">
                    <p className="notification-title">{notification.title}</p>
                    <p className="notification-message">{notification.message}</p>
                    <span className="notification-time">{formatTime(notification.createdAt)}</span>
                  </div>

                  <button
                    className="notification-delete"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteNotification(notification._id);
                    }}
                    aria-label="Bildirimi sil"
                  >
                    <X size={14} />
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
