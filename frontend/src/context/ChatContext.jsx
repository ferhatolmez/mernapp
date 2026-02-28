import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';

const ChatContext = createContext();

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [socketConnected, setSocketConnected] = useState(false);

    // Seçili sohbet odası ve kullanıcının dahil olduğu tüm odalar
    const [selectedChat, setSelectedChat] = useState();
    const [chats, setChats] = useState([]);

    // Mesajlaşma state'leri
    const [messages, setMessages] = useState([]);
    const [notification, setNotification] = useState([]);

    useEffect(() => {
        if (user) {
            // Sadece token varsa bağlan
            const token = localStorage.getItem('token');

            const newSocket = io(SOCKET_URL, {
                auth: {
                    token
                }
            });

            setSocket(newSocket);

            newSocket.on('connect', () => {
                setSocketConnected(true);
            });

            newSocket.on('disconnect', () => {
                setSocketConnected(false);
            });

            // Mesaja gelen olaylar vb. ilerleyen aşamada ayarlanacak

            return () => {
                newSocket.disconnect();
            };
        }
    }, [user]);

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
