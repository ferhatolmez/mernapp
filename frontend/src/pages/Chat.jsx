import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
const ROOM = 'general';

const Chat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // ─── Geçmiş mesajları yükle ─────────────────────────────────────
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await api.get('/chat/messages', {
          params: { room: ROOM, limit: 30 },
        });
        const { messages: msgs, hasMore: more } = res.data.data;
        setMessages(msgs);
        setHasMore(more);
        if (msgs.length > 0) setOldestMessageId(msgs[0]._id);
      } catch (err) {
        console.error('Mesaj geçmişi yüklenemedi:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, []);

  // ─── Daha eski mesajları yükle (sonsuz scroll) ──────────────────
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || !oldestMessageId) return;
    try {
      const res = await api.get('/chat/messages', {
        params: { room: ROOM, before: oldestMessageId, limit: 30 },
      });
      const { messages: older, hasMore: more } = res.data.data;
      setMessages((prev) => [...older, ...prev]);
      setHasMore(more);
      if (older.length > 0) setOldestMessageId(older[0]._id);
    } catch (err) {
      console.error(err);
    }
  }, [hasMore, oldestMessageId]);

  // ─── Socket.io bağlantısı ────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('joinRoom', ROOM);
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('newMessage', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });

    socket.on('userTyping', ({ userId, name, isTyping }) => {
      if (userId === user._id) return;
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.includes(name) ? prev : [...prev, name];
        }
        return prev.filter((n) => n !== name);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user._id]);

  // ─── Yeni mesaj gelince en aşağıya scroll ───────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Mesaj gönder ────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    if (!newMessage.trim() || !socketRef.current || !isConnected) return;

    socketRef.current.emit('sendMessage', {
      content: newMessage.trim(),
      room: ROOM,
    });
    setNewMessage('');
    inputRef.current?.focus();
  }, [newMessage, isConnected]);

  // ─── Klavye kısayolu ─────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // ─── Yazıyor bildirimi ───────────────────────────────────────────
  const handleInputChange = useCallback((e) => {
    setNewMessage(e.target.value);

    if (!socketRef.current) return;
    socketRef.current.emit('typing', { room: ROOM, isTyping: true });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { room: ROOM, isTyping: false });
    }, 1500);
  }, []);

  // ─── Mesaj gruplama: aynı gönderici + yakın zamanlı ─────────────
  const groupedMessages = useMemo(() => {
    return messages.map((msg, idx) => {
      const prev = messages[idx - 1];
      const isSameSender = prev?.sender?._id === msg.sender?._id;
      const timeDiff = prev
        ? new Date(msg.createdAt) - new Date(prev.createdAt)
        : Infinity;
      const isGrouped = isSameSender && timeDiff < 60000; // 1 dakika içinde
      return { ...msg, isGrouped };
    });
  }, [messages]);

  const isOwnMessage = useCallback(
    (msg) => msg.sender?._id === user._id,
    [user._id]
  );

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="chat-page">
      {/* ─── Sol panel: Online kullanıcılar ─── */}
      <div className="chat-sidebar">
        <div className="sidebar-header">
          <h3>Online</h3>
          <span className="online-count">{onlineUsers.length}</span>
        </div>
        <div className="online-list">
          {onlineUsers.map((u) => (
            <div key={u.userId} className="online-user">
              <div className="online-dot" />
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&size=32`}
                alt={u.name}
                className="user-avatar-xs"
              />
              <span>{u.name}</span>
              <span className={`role-badge-xs role-${u.role}`}>{u.role}</span>
            </div>
          ))}
          {onlineUsers.length === 0 && (
            <p className="text-muted text-sm">Kimse yok</p>
          )}
        </div>
      </div>

      {/* ─── Ana chat alanı ─── */}
      <div className="chat-main">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-room-info">
            <span className="room-icon">#</span>
            <span className="room-name">genel</span>
          </div>
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot" />
            {isConnected ? 'Bağlı' : 'Bağlanıyor...'}
          </div>
        </div>

        {/* Mesajlar */}
        <div className="messages-container">
          {isLoadingHistory ? (
            <div className="messages-loading">Mesajlar yükleniyor...</div>
          ) : (
            <>
              {hasMore && (
                <button
                  onClick={loadMoreMessages}
                  className="load-more-btn"
                >
                  Daha eski mesajlar
                </button>
              )}

              {groupedMessages.length === 0 && (
                <div className="empty-chat">
                  <span>💬</span>
                  <p>Henüz mesaj yok. İlk mesajı siz gönderin!</p>
                </div>
              )}

              {groupedMessages.map((msg) => (
                <div
                  key={msg._id}
                  className={`message ${isOwnMessage(msg) ? 'message-own' : 'message-other'} ${msg.isGrouped ? 'message-grouped' : ''}`}
                >
                  {!msg.isGrouped && !isOwnMessage(msg) && (
                    <img
                      src={msg.sender?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.name || '?')}`}
                      alt={msg.sender?.name}
                      className="message-avatar"
                    />
                  )}
                  <div className="message-bubble">
                    {!msg.isGrouped && !isOwnMessage(msg) && (
                      <div className="message-sender">
                        <span className="sender-name">{msg.sender?.name}</span>
                        <span className={`role-badge-xs role-${msg.sender?.role}`}>
                          {msg.sender?.role}
                        </span>
                      </div>
                    )}
                    <div className="message-content">{msg.content}</div>
                    <div className="message-time">{formatTime(msg.createdAt)}</div>
                  </div>
                </div>
              ))}

              {typingUsers.length > 0 && (
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <span /><span /><span />
                  </div>
                  <span className="typing-text">
                    {typingUsers.join(', ')} yazıyor...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input alanı */}
        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Mesajınızı yazın... (Enter ile gönderin)"
              className="chat-input"
              rows={1}
              maxLength={1000}
              disabled={!isConnected}
            />
            <div className="input-actions">
              <span className="char-count">{newMessage.length}/1000</span>
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || !isConnected}
                className="send-btn"
              >
                ➤
              </button>
            </div>
          </div>
          <p className="chat-hint">Enter ile gönder • Shift+Enter ile yeni satır</p>
        </div>
      </div>
    </div>
  );
};

export default Chat;
