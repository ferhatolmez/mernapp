import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';
import { io } from 'socket.io-client';

const NotificationContext = createContext(null);
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const socketRef = useRef(null);

    // Bildirimleri yükle
    const fetchNotifications = useCallback(async () => {
        try {
            const res = await api.get('/notifications?limit=20');
            setNotifications(res.data.data.notifications);
            setUnreadCount(res.data.data.unreadCount);
        } catch (err) {
            console.error('Bildirimler yüklenemedi:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Socket.io ile real-time bildirimler
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        fetchNotifications();

        socketRef.current = io(SOCKET_URL, {
            auth: { token },
            reconnection: true,
        });

        socketRef.current.on('newNotification', (notification) => {
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [fetchNotifications]);

    // Bildirimi okundu işaretle
    const markAsRead = useCallback(async (id) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error(err);
        }
    }, []);

    // Tümünü okundu işaretle
    const markAllAsRead = useCallback(async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error(err);
        }
    }, []);

    // Bildirim sil
    const deleteNotification = useCallback(async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => {
                const removed = prev.find(n => n._id === id);
                if (removed && !removed.isRead) {
                    setUnreadCount(c => Math.max(0, c - 1));
                }
                return prev.filter(n => n._id !== id);
            });
        } catch (err) {
            console.error(err);
        }
    }, []);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            isLoading,
            markAsRead,
            markAllAsRead,
            deleteNotification,
            refetch: fetchNotifications,
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
    return ctx;
};
