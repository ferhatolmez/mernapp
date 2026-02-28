import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';

const Chat = () => {
  const { user } = useAuth();
  const {
    socket,
    socketConnected,
    selectedChat,
    setSelectedChat,
    chats,
    setChats,
    messages,
    setMessages,
    onlineUsers,
  } = useChat();
  const toast = useToast();

  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);

  // Mesaj düzenleme
  const [editingMsg, setEditingMsg] = useState(null);
  const [editContent, setEditContent] = useState('');

  // Dosya Yükleme
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Kullanıcı Arama
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // ═══════════════════════════════════════════════════════
  // 1. SOHBET LİSTESİNİ ÇEK (Genel + Private Odalar)
  // ═══════════════════════════════════════════════════════
  const fetchChats = useCallback(async () => {
    try {
      const { data } = await api.get('/chat/');
      setChats(data.data.rooms || []);
    } catch (error) {
      console.error('Sohbetler yüklenemedi:', error);
    }
  }, [setChats]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // ═══════════════════════════════════════════════════════
  // 2. KULLANICI ARA (Yeni /api/users/search?q= endpoint)
  // ═══════════════════════════════════════════════════════
  const searchTimerRef = useRef(null);

  const handleSearchUser = (e) => {
    const q = e.target.value;
    setSearchQuery(q);

    if (!q.trim()) {
      setSearchResults([]);
      return;
    }

    // Debounce: 400ms bekle
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
        setSearchResults(data.data.users || []);
      } catch (error) {
        console.error('Kullanıcı arama hatası:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  // ═══════════════════════════════════════════════════════
  // 3. SOHBETE ERİŞ (accessChat — Yeni veya Var Olan)
  // ═══════════════════════════════════════════════════════
  const accessChat = async (targetUserId) => {
    try {
      const { data } = await api.post('/chat/access', { userId: targetUserId });
      const room = data.data.room;

      if (!chats.find((c) => c._id === room._id)) {
        setChats((prev) => [room, ...prev]);
      }
      handleSwitchRoom(room);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      toast.error('Sohbete erişilemedi');
    }
  };

  // ═══════════════════════════════════════════════════════
  // 4. ODA DEĞİŞTİRME & MESAJLARI ÇEK
  // ═══════════════════════════════════════════════════════
  const handleSwitchRoom = useCallback((roomObj) => {
    if (selectedChat?._id === roomObj._id) return;

    if (selectedChat && socket) {
      socket.emit('leaveRoom', selectedChat.name);
    }

    setSelectedChat(roomObj);
    setMessages([]);

    if (socket) {
      socket.emit('joinRoom', roomObj.name);
    }
    setShowSidebar(false);

    // Mesajları API'den çek
    (async () => {
      try {
        const { data } = await api.get(`/chat/messages?room=${roomObj.name}&limit=50`);
        setMessages(data.data.messages || []);
      } catch (error) {
        console.error('Mesajlar yüklenemedi', error);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat, socket, setMessages, setSelectedChat]);

  // ═══════════════════════════════════════════════════════
  // 5. SOCKET DİNLEYİCİLERİ
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (selectedChat && message.room === selectedChat.name) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const handleMessageEdited = ({ messageId, content, isEdited, editedAt }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, content, isEdited, editedAt } : msg
        )
      );
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, isDeleted: true, content: 'Bu mesaj silindi' }
            : msg
        )
      );
    };

    const handleUserTyping = ({ userId, name, isTyping }) => {
      if (userId === user._id) return;
      setTypingUsers((prev) => {
        if (isTyping) return prev.includes(name) ? prev : [...prev, name];
        return prev.filter((n) => n !== name);
      });
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('messageEdited', handleMessageEdited);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('userTyping', handleUserTyping);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messageEdited', handleMessageEdited);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('userTyping', handleUserTyping);
    };
  }, [socket, selectedChat, user._id, setMessages]);

  // Yeni mesaj gelince en alta kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ═══════════════════════════════════════════════════════
  // 6. MESAJ GÖNDER
  // ═══════════════════════════════════════════════════════
  const sendMessage = useCallback(() => {
    if (!newMessage.trim() || !socket || !socketConnected || !selectedChat) return;

    socket.emit('sendMessage', {
      content: newMessage.trim(),
      room: selectedChat.name,
      type: 'text',
    });
    setNewMessage('');
    inputRef.current?.focus();
  }, [newMessage, socket, socketConnected, selectedChat]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const handleInputChange = useCallback(
    (e) => {
      setNewMessage(e.target.value);
      if (!socket || !selectedChat) return;
      socket.emit('typing', { room: selectedChat.name, isTyping: true });

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { room: selectedChat.name, isTyping: false });
      }, 1500);
    },
    [socket, selectedChat]
  );

  // ═══════════════════════════════════════════════════════
  // 7. MESAJ DÜZENLE & SİL
  // ═══════════════════════════════════════════════════════
  const handleEditMessage = useCallback(() => {
    if (!editingMsg || !editContent.trim()) return;
    socket?.emit('editMessage', {
      messageId: editingMsg._id,
      content: editContent.trim(),
      room: selectedChat?.name,
    });
    setEditingMsg(null);
    setEditContent('');
  }, [editingMsg, editContent, socket, selectedChat]);

  const handleDeleteMessage = useCallback(
    (messageId) => {
      socket?.emit('deleteMessage', { messageId, room: selectedChat?.name });
    },
    [socket, selectedChat]
  );

  // ═══════════════════════════════════════════════════════
  // 8. DOSYA YÜKLE
  // ═══════════════════════════════════════════════════════
  const handleFileUpload = async () => {
    if (!selectedFile || !socket || !socketConnected || !selectedChat) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await api.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileData = res.data.data;
      const isImage = selectedFile.type.startsWith('image/');

      socket.emit('sendMessage', {
        content: selectedFile.name,
        room: selectedChat.name,
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
  };

  // ═══════════════════════════════════════════════════════
  // YARDIMCILAR
  // ═══════════════════════════════════════════════════════

  // Karşı kullanıcının adını oda bilgisinden çıkar
  const getChatDisplayName = (roomObj) => {
    if (!roomObj) return '';

    // Private oda ve members populate edilmişse
    if (roomObj.type === 'private' && roomObj.members && roomObj.members.length > 0) {
      const otherMember = roomObj.members.find(
        (m) => (m._id || m) !== user._id && (m._id?.toString?.() || m.toString()) !== user._id
      );
      if (otherMember && otherMember.name) return otherMember.name;
    }

    // Private oda ama members bilgisi yoksa
    if (roomObj.name?.startsWith('private_')) {
      return 'Özel Sohbet';
    }

    return roomObj.name || 'Oda';
  };

  const getChatAvatar = (roomObj) => {
    if (roomObj?.type === 'private' && roomObj.members) {
      const otherMember = roomObj.members.find(
        (m) => (m._id?.toString?.() || m.toString()) !== user._id
      );
      if (otherMember?.avatar) return otherMember.avatar;
      if (otherMember?.name) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(otherMember.name)}&background=f97316&color=fff&size=40`;
      }
    }
    return null;
  };

  const getChatIcon = (roomObj) => {
    if (roomObj?.type === 'private') return '👤';
    return roomObj?.icon || '💬';
  };

  const isOwnMessage = (msg) => msg.sender?._id === user._id;

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="chat-page">
      {/* ────────── SOL PANEL ────────── */}
      <div className={`chat-sidebar ${showSidebar ? 'chat-sidebar-open' : ''}`}>
        <div className="sidebar-section">
          <div className="sidebar-header">
            <h3>💬 Mesajlar</h3>
            <button
              className="hidden-desktop btn-text"
              onClick={() => setShowSidebar(false)}
              style={{ fontSize: '1.2rem' }}
            >
              ✕
            </button>
          </div>

          {/* Kullanıcı Arama */}
          <div className="search-section" style={{ marginBottom: '12px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchUser}
              placeholder="🔍 Kişi ara..."
              className="search-input"
            />
            {searchQuery && (
              <div className="search-history" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {isSearching ? (
                  <p style={{ fontSize: '12px', padding: '10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Aranıyor...
                  </p>
                ) : searchResults.length > 0 ? (
                  searchResults.map((usr) => (
                    <button
                      key={usr._id}
                      className="search-history-item"
                      onClick={() => accessChat(usr._id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                    >
                      <img
                        src={usr.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(usr.name)}&size=28&background=f97316&color=fff`}
                        alt=""
                        style={{ width: 28, height: 28, borderRadius: '50%' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{usr.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{usr.email}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <p style={{ fontSize: '12px', padding: '10px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Kullanıcı bulunamadı
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Sohbet Listesi */}
          <div className="room-list">
            {chats.length > 0 ? (
              chats.map((c) => {
                const avatar = getChatAvatar(c);
                return (
                  <button
                    key={c._id}
                    className={`room-item ${selectedChat?._id === c._id ? 'active' : ''}`}
                    onClick={() => handleSwitchRoom(c)}
                  >
                    {avatar ? (
                      <img src={avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span className="room-icon">{getChatIcon(c)}</span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="room-name">{getChatDisplayName(c)}</span>
                      {c.description && c.type !== 'private' && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <p style={{ fontSize: '12px', textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>
                Henüz sohbet yok. Yukarıdan kişi arayarak başlayın!
              </p>
            )}
          </div>
        </div>

        {/* Online Kullanıcılar */}
        <div className="sidebar-section">
          <div className="sidebar-header">
            <h3>🟢 Online</h3>
            <span className="online-count">{onlineUsers.length}</span>
          </div>
          <div className="online-list">
            {onlineUsers.length > 0 ? (
              onlineUsers.map((u) => (
                <div
                  key={u.userId}
                  className="online-user"
                  style={{ cursor: 'pointer' }}
                  onClick={() => accessChat(u.userId)}
                >
                  <div className="online-dot" />
                  <img
                    src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&size=28&background=128C7E&color=fff`}
                    alt={u.name}
                    className="user-avatar-xs"
                  />
                  <span>{u.name}</span>
                </div>
              ))
            ) : (
              <p className="text-muted text-sm">Çevrimiçi kimse yok</p>
            )}
          </div>
        </div>
      </div>

      {/* ────────── SAĞ PANEL: CHAT ALANI ────────── */}
      <div className="chat-main">
        {selectedChat ? (
          <>
            {/* HEADER */}
            <div className="chat-header">
              <div className="chat-room-info">
                <button
                  className="hidden-desktop"
                  onClick={() => setShowSidebar(true)}
                  style={{
                    marginRight: '12px',
                    fontSize: '1.4rem',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    cursor: 'pointer'
                  }}
                  title="Sohbet Listesine Dön"
                >
                  ←
                </button>
                {getChatAvatar(selectedChat) ? (
                  <img
                    src={getChatAvatar(selectedChat)}
                    alt=""
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <span className="room-icon">{getChatIcon(selectedChat)}</span>
                )}
                <div>
                  <span className="room-name" style={{ fontWeight: 700 }}>
                    {getChatDisplayName(selectedChat)}
                  </span>
                  {selectedChat.description && selectedChat.type !== 'private' && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {selectedChat.description}
                    </div>
                  )}
                </div>
              </div>
              <div className={`connection-status ${socketConnected ? 'connected' : 'disconnected'}`}>
                <span className="status-dot" />
                {socketConnected ? 'Bağlı' : 'Bağlanıyor..'}
              </div>
            </div>

            {/* MESAJLAR */}
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="empty-chat">
                  <span>💬</span>
                  <p>Henüz mesaj yok. İlk mesajı siz gönderin!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isOwn = isOwnMessage(msg);
                  return (
                    <div
                      key={msg._id}
                      className={`message ${isOwn ? 'message-own' : 'message-other'} ${msg.isDeleted ? 'message-deleted' : ''}`}
                    >
                      {!isOwn && (
                        <img
                          src={
                            msg.sender?.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.name || '?')}&size=32&background=a78bfa&color=fff`
                          }
                          alt=""
                          className="message-avatar"
                        />
                      )}

                      <div className="message-bubble">
                        {!isOwn && (
                          <div className="message-sender">
                            <span className="sender-name">{msg.sender?.name}</span>
                          </div>
                        )}

                        {/* Düzenleme modu */}
                        {editingMsg?._id === msg._id ? (
                          <div className="message-edit-form">
                            <input
                              type="text"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleEditMessage();
                                if (e.key === 'Escape') { setEditingMsg(null); setEditContent(''); }
                              }}
                              autoFocus
                            />
                            <div className="message-edit-actions">
                              <button onClick={handleEditMessage} className="btn-text">✓</button>
                              <button onClick={() => { setEditingMsg(null); setEditContent(''); }} className="btn-text">✕</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Dosya/resim */}
                            {msg.type === 'image' && msg.fileUrl && !msg.isDeleted ? (
                              <img src={msg.fileUrl} alt="" className="message-image" />
                            ) : msg.type === 'file' && msg.fileUrl && !msg.isDeleted ? (
                              <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="message-file">
                                📎 {msg.fileName}
                              </a>
                            ) : (
                              <div className="message-content">{msg.content}</div>
                            )}
                          </>
                        )}

                        <div className="message-meta">
                          <span className="message-time">{formatTime(msg.createdAt)}</span>
                          {msg.isEdited && <span className="message-edited">(düzenlendi)</span>}
                        </div>

                        {/* Mesaj aksiyonları */}
                        {!msg.isDeleted && isOwn && !editingMsg && (
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
                        {!msg.isDeleted && !isOwn && ['admin', 'moderator'].includes(user.role) && (
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
                  );
                })
              )}

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
            </div>

            {/* DOSYA ÖNİZLEME */}
            {selectedFile && (
              <div className="file-preview">
                <span className="file-preview-name">📎 {selectedFile.name}</span>
                <span className="file-preview-size">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                <button
                  onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="file-preview-remove"
                >✕</button>
                <button onClick={handleFileUpload} disabled={isUploading} className="send-btn" style={{ width: 'auto', borderRadius: '8px', padding: '6px 16px', fontSize: '0.85rem' }}>
                  {isUploading ? 'Yükleniyor...' : 'Gönder'}
                </button>
              </div>
            )}

            {/* INPUT ALANI */}
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
                  disabled={!socketConnected}
                >
                  📎
                </button>
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Bir mesaj yazın..."
                  className="chat-input"
                  rows={1}
                  maxLength={1000}
                  disabled={!socketConnected}
                />
                <div className="input-actions">
                  <span className="char-count">{newMessage.length}/1000</span>
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || !socketConnected}
                    className="send-btn"
                  >
                    ➤
                  </button>
                </div>
              </div>
              <p className="chat-hint">
                Enter ile gönder • Shift+Enter ile yeni satır • 📎 ile dosya paylaş
              </p>
            </div>
          </>
        ) : (
          /* Sohbet seçilmemiş */
          <div className="empty-chat" style={{ height: '100%' }}>
            <span style={{ fontSize: '72px' }}>💬</span>
            <h2 style={{ marginTop: '16px', fontWeight: 800 }}>Sohbet</h2>
            <p style={{ maxWidth: '300px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Sol panelden bir kişi arayarak veya mevcut bir sohbete tıklayarak mesajlaşmaya başlayın.
            </p>
            <button
              className="hidden-desktop"
              onClick={() => setShowSidebar(true)}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                borderRadius: '24px',
                background: 'var(--gradient-primary)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              ☰ Sohbetleri Göster
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
