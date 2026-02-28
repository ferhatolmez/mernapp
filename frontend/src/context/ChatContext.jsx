import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';

const ChatContext = createContext();

// SOCKET_URL'de /api olmamalı — sadece sunucu adresi
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL
    || (process.env.REACT_APP_API_URL
        ? process.env.REACT_APP_API_URL.replace('/api', '')
        : 'https://mernapp-1ygk.onrender.com');

export const ChatProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState(null);
    const [socketConnected, setSocketConnected] = useState(false);
    const socketRef = useRef(null);

    // Seçili sohbet odası ve kullanıcının dahil olduğu tüm odalar
    const [selectedChat, setSelectedChat] = useState(null);
    const [chats, setChats] = useState([]);

    // Mesajlaşma state'leri
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [notification, setNotification] = useState([]);

    useEffect(() => {
        // Kullanıcı giriş yapmışsa socket bağlantısı kur
        if (isAuthenticated && user) {
            // accessToken — AuthContext bu isimlendirmeyi kullanıyor
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const newSocket = io(SOCKET_URL, {
                auth: { token },
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 2000,
            });

            socketRef.current = newSocket;
            setSocket(newSocket);

            newSocket.on('connect', () => {
                console.log('✅ Socket bağlantısı kuruldu');
                setSocketConnected(true);
            });

            newSocket.on('disconnect', () => {
                console.log('🔴 Socket bağlantısı kesildi');
                setSocketConnected(false);
            });

            newSocket.on('connect_error', (err) => {
                console.error('❌ Socket bağlantı hatası:', err.message);
                setSocketConnected(false);
            });

            // Online kullanıcılar listesi
            newSocket.on('onlineUsers', (users) => {
                setOnlineUsers(users);
            });

            return () => {
                newSocket.disconnect();
                socketRef.current = null;
            };
        } else {
            // Kullanıcı çıkış yaptıysa socket'i kapat
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setSocket(null);
                setSocketConnected(false);
                setOnlineUsers([]);
            }
        }
    }, [isAuthenticated, user]);

    return (
        <ChatContext.Provider
            value={{
                socket,
                socketConnected,
                selectedChat,
                setSelectedChat,
                chats,
                setChats,
                messages,
                setMessages,
                onlineUsers,
                setOnlineUsers,
                notification,
                setNotification,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export const useChat = () => {
    return useContext(ChatContext);
};
