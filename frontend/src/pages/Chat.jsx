import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://mernapp-1ygk.onrender.com';

const Chat = () => {
  const { user } = useAuth();
  const toast = useToast();

  // Odalar
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState('general');

  // Mesajlar
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [oldestMessageId, setOldestMessageId] = useState(null);

  // Mesaj düzenleme
  const [editingMsg, setEditingMsg] = useState(null);
  const [editContent, setEditContent] = useState('');

  // Dosya paylaşımı
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Arama geçmişi
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);

  // Mobil sidebar
  const [showSidebar, setShowSidebar] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // ─── Odaları yükle ──────────────────────────────────────────────
  useEffect(() => {
    const loadRooms = async () => {
      try {
        const res = await api.get('/chat/rooms');
        setRooms(res.data.data.rooms);
      } catch (err) {
        console.error('Odalar yüklenemedi:', err);
      }
    };
    loadRooms();
  }, []);

  // ─── Arama geçmişini yükle ─────────────────────────────────────
  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const res = await api.get('/users/search-history');
        setSearchHistory(res.data.data.searchHistory || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadSearchHistory();
  }, []);

  // ─── Geçmiş mesajları yükle ─────────────────────────────────────
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const res = await api.get('/chat/messages', {
          params: { room: currentRoom, limit: 30 },
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
  }, [currentRoom]);

  // ─── Daha eski mesajları yükle ──────────────────────────────────
  const loadMoreMessages = useCallback(async () => {
    if (!hasMore || !oldestMessageId) return;
    try {
      const res = await api.get('/chat/messages', {
        params: { room: currentRoom, before: oldestMessageId, limit: 30 },
      });
      const { messages: older, hasMore: more } = res.data.data;
      setMessages((prev) => [...older, ...prev]);
      setHasMore(more);
      if (older.length > 0) setOldestMessageId(older[0]._id);
    } catch (err) {
      console.error(err);
    }
  }, [hasMore, oldestMessageId, currentRoom]);

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
      socket.emit('joinRoom', currentRoom);
    });

    socket.on('disconnect', () => setIsConnected(false));

    socket.on('newMessage', (message) => {
      if (message.room === currentRoom) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on('messageEdited', ({ messageId, content, isEdited, editedAt }) => {
      setMessages(prev => prev.map(msg =>
        msg._id === messageId ? { ...msg, content, isEdited, editedAt } : msg
      ));
    });

    socket.on('messageDeleted', ({ messageId }) => {
      setMessages(prev => prev.map(msg =>
        msg._id === messageId ? { ...msg, isDeleted: true, content: 'Bu mesaj silindi' } : msg
      ));
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
  }, [user._id, currentRoom]);

  // ─── Oda değiştir ───────────────────────────────────────────────
  const switchRoom = useCallback((roomName) => {
    if (roomName === currentRoom) return;
    socketRef.current?.emit('leaveRoom', currentRoom);
    setCurrentRoom(roomName);
    setMessages([]);
    setOldestMessageId(null);
    socketRef.current?.emit('joinRoom', roomName);
    setShowSidebar(false);
  }, [currentRoom]);

  // ─── Yeni mesaj gelince scroll ───────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ─── Mesaj gönder ────────────────────────────────────────────────
  const sendMessage = useCallback(() => {
    if (!newMessage.trim() || !socketRef.current || !isConnected) return;

    socketRef.current.emit('sendMessage', {
      content: newMessage.trim(),
      room: currentRoom,
      type: 'text',
    });
    setNewMessage('');
    inputRef.current?.focus();
  }, [newMessage, isConnected, currentRoom]);

  // ─── Dosya gönder ───────────────────────────────────────────────
  const handleFileUpload = useCallback(async () => {
    if (!selectedFile || !socketRef.current || !isConnected) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await api.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const fileData = res.data.data;
      const isImage = selectedFile.type.startsWith('image/');

      socketRef.current.emit('sendMessage', {
        content: selectedFile.name,
        room: currentRoom,
        type: isImage ? 'image' : 'file',
        fileData,
      });

      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Dosya gönderildi!');
    } catch (err) {
      toast.error('Dosya yüklenemedi');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, isConnected, currentRoom, toast]);

  // ─── Mesaj düzenle ───────────────────────────────────────────────
  const handleEditMessage = useCallback(() => {
    if (!editingMsg || !editContent.trim()) return;
    socketRef.current?.emit('editMessage', {
      messageId: editingMsg._id,
      content: editContent.trim(),
      room: currentRoom,
    });
    setEditingMsg(null);
    setEditContent('');
  }, [editingMsg, editContent, currentRoom]);

  // ─── Mesaj sil ──────────────────────────────────────────────────
  const handleDeleteMessage = useCallback((messageId) => {
    socketRef.current?.emit('deleteMessage', { messageId, room: currentRoom });
  }, [currentRoom]);

  // ─── Arama kaydet ───────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    try {
      await api.post('/users/search-history', { query: searchQuery.trim() });
      setSearchHistory(prev => [{ query: searchQuery.trim(), searchedAt: new Date() }, ...prev.filter(h => h.query !== searchQuery.trim())].slice(0, 20));
    } catch (err) {
      console.error(err);
    }
  }, [searchQuery]);

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
    socketRef.current.emit('typing', { room: currentRoom, isTyping: true });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { room: currentRoom, isTyping: false });
    }, 1500);
  }, [currentRoom]);

  // ─── Mesaj gruplama ─────────────────────────────────────────────
  const groupedMessages = useMemo(() => {
    return messages.map((msg, idx) => {
      const prev = messages[idx - 1];
      const isSameSender = prev?.sender?._id === msg.sender?._id;
      const timeDiff = prev ? new Date(msg.createdAt) - new Date(prev.createdAt) : Infinity;
      const isGrouped = isSameSender && timeDiff < 60000;
      return { ...msg, isGrouped };
    });
  }, [messages]);

  const isOwnMessage = useCallback(
    (msg) => msg.sender?._id === user._id,
    [user._id]
  );

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const currentRoomData = rooms.find(r => r.name === currentRoom);

  return (
    <div className="chat-page">
      {/* ─── Sol panel: Odalar + Online kullanıcılar ─── */}
      <div className={`chat-sidebar ${showSidebar ? 'chat-sidebar-open' : ''}`}>
        {/* Odalar */}
        <div className="sidebar-section">
          <div className="sidebar-header">
            <h3>Odalar</h3>
          </div>
          <div className="room-list">
            {rooms.map((room) => (
              <button
                key={room._id || room.name}
                className={`room-item ${room.name === currentRoom ? 'active' : ''}`}
                onClick={() => switchRoom(room.name)}
              >
                <span className="room-icon">{room.icon || '#'}</span>
                <span className="room-name">{room.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Arama geçmişi */}
        <div className="sidebar-section">
          <div className="sidebar-header">
            <h3>Arama</h3>
          </div>
          <div className="search-section">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchHistory(true)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ara..."
              className="search-input"
            />
            {showSearchHistory && searchHistory.length > 0 && (
              <div className="search-history">
                <p className="search-history-title">Son aramalar</p>
                {searchHistory.slice(0, 5).map((h, i) => (
                  <button key={i} className="search-history-item" onClick={() => { setSearchQuery(h.query); setShowSearchHistory(false); }}>
                    🕒 {h.query}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Online kullanıcılar */}
        <div className="sidebar-section">
          <div className="sidebar-header">
            <h3>Online</h3>
            <span className="online-count">{onlineUsers.length}</span>
          </div>
          <div className="online-list">
            {onlineUsers.map((u) => (
              <div key={u.userId} className="online-user">
                <div className="online-dot" />
                <img
                  src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&size=32`}
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
      </div>

      {/* Mobil sidebar toggle */}
      <button className="chat-sidebar-toggle" onClick={() => setShowSidebar(!showSidebar)}>
        {showSidebar ? '✕' : '☰'}
      </button>

      {/* ─── Ana chat alanı ─── */}
      <div className="chat-main">
        {/* Header */}
        <div className="chat-header">
          <div className="chat-room-info">
            <span className="room-icon">{currentRoomData?.icon || '#'}</span>
            <span className="room-name">{currentRoom}</span>
            {currentRoomData?.description && (
              <span className="room-description">{currentRoomData.description}</span>
            )}
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
                <button onClick={loadMoreMessages} className="load-more-btn">
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
                  className={`message ${isOwnMessage(msg) ? 'message-own' : 'message-other'} ${msg.isGrouped ? 'message-grouped' : ''} ${msg.isDeleted ? 'message-deleted' : ''}`}
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

                    {/* Dosya/resim önizleme */}
                    {msg.type === 'image' && msg.fileUrl && !msg.isDeleted && (
                      <img src={`${SOCKET_URL}${msg.fileUrl}`} alt={msg.fileName} className="message-image" />
                    )}
                    {msg.type === 'file' && msg.fileUrl && !msg.isDeleted && (
                      <a href={`${SOCKET_URL}${msg.fileUrl}`} target="_blank" rel="noopener noreferrer" className="message-file">
                        📎 {msg.fileName}
                      </a>
                    )}

                    {/* Düzenleme modu */}
                    {editingMsg?._id === msg._id ? (
                      <div className="message-edit-form">
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleEditMessage()}
                          autoFocus
                        />
                        <div className="message-edit-actions">
                          <button onClick={handleEditMessage} className="btn-text">✓</button>
                          <button onClick={() => { setEditingMsg(null); setEditContent(''); }} className="btn-text">✕</button>
                        </div>
                      </div>
                    ) : (
                      <div className="message-content">{msg.content}</div>
                    )}

                    <div className="message-meta">
                      <span className="message-time">{formatTime(msg.createdAt)}</span>
                      {msg.isEdited && <span className="message-edited">(düzenlendi)</span>}
                    </div>

                    {/* Mesaj aksiyonları */}
                    {!msg.isDeleted && isOwnMessage(msg) && !editingMsg && (
                      <div className="message-actions">
                        <button
                          onClick={() => { setEditingMsg(msg); setEditContent(msg.content); }}
                          className="message-action-btn"
                          title="Düzenle"
                        >✏️</button>
                        <button
                          onClick={() => handleDeleteMessage(msg._id)}
                          className="message-action-btn"
                          title="Sil"
                        >🗑️</button>
                      </div>
                    )}
                    {/* Admin/mod da silebilir */}
                    {!msg.isDeleted && !isOwnMessage(msg) && ['admin', 'moderator'].includes(user.role) && (
                      <div className="message-actions">
                        <button
                          onClick={() => handleDeleteMessage(msg._id)}
                          className="message-action-btn"
                          title="Sil (Moderatör)"
                        >🗑️</button>
                      </div>
                    )}
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

        {/* Dosya önizleme */}
        {selectedFile && (
          <div className="file-preview">
            <span className="file-preview-name">📎 {selectedFile.name}</span>
            <span className="file-preview-size">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="file-preview-remove">✕</button>
            <button onClick={handleFileUpload} disabled={isUploading} className="btn btn-primary btn-sm">
              {isUploading ? 'Yükleniyor...' : 'Gönder'}
            </button>
          </div>
        )}

        {/* Input alanı */}
        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => setSelectedFile(e.target.files[0])}
              style={{ display: 'none' }}
              accept="image/*,application/pdf,.doc,.docx,.txt,.zip,.rar"
            />
            <button
              className="chat-file-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Dosya gönder"
              disabled={!isConnected}
            >
              📎
            </button>
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
          <p className="chat-hint">Enter ile gönder • Shift+Enter ile yeni satır • 📎 ile dosya gönder</p>
        </div>
      </div>
    </div>
  );
};

export default Chat;
