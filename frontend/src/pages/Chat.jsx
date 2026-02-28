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
  } = useChat();
  const toast = useToast();

  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);

  // Dosya Yükleme
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Arama Modeli
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // 1. ODA LİSTESİNİ ÇEKME (Hem Özel Hem Genel)
  const fetchChats = async () => {
    try {
      const { data } = await api.get('/chat/');
      setChats(data.data.rooms);
    } catch (error) {
      toast.error('Sohbetler yüklenemedi!');
    }
  };

  useEffect(() => {
    fetchChats();
    // eslint-disable-next-line
  }, []);

  // 2. KULLANICI ARAMA (Yeni Biriyle Sohbet Başlatmak İçin)
  const handleSearchUser = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);

    if (!q) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const { data } = await api.get(`/users?search=${q}`);
      setSearchResults(data.data.users);
    } catch (error) {
      console.error('Kullanıcı arama hatası:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 3. SOHBETE ERİŞ (Yeni veya Var Olan)
  const accessChat = async (targetUserId) => {
    try {
      const { data } = await api.post('/chat/access', { userId: targetUserId });
      if (!chats.find((c) => c._id === data.data.room._id)) {
        setChats([data.data.room, ...chats]);
      }
      switchRoom(data.data.room);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      toast.error('Sohbete erişilemedi');
    }
  };

  // 4. SEÇİLİ ODAYI DEĞİŞTİRME & MESAJLARI ÇEKME
  const switchRoom = useCallback((roomObj) => {
    if (selectedChat?._id === roomObj._id) return;

    if (selectedChat && socket) {
      socket.emit('leaveRoom', selectedChat.name);
    }

    setSelectedChat(roomObj);
    setMessages([]); // Sayfa değişirken eski mesajları sıfırla

    if (socket) {
      socket.emit('joinRoom', roomObj.name);
    }
    setShowSidebar(false);

    // Mesajları getir
    fetchMessages(roomObj.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat, socket, setMessages, setSelectedChat]);

  const fetchMessages = async (roomName) => {
    try {
      const { data } = await api.get(`/chat/messages?room=${roomName}&limit=50`);
      setMessages(data.data.messages);
    } catch (error) {
      console.error('Mesajlar yüklenemedi', error);
    }
  };

  // 5. SOCKET DİNLEYİCİLERİ
  useEffect(() => {
    if (!socket) return;

    socket.on('newMessage', (message) => {
      if (selectedChat && message.room === selectedChat.name) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on('messageEdited', ({ messageId, content, isEdited, editedAt }) => {
      setMessages((prev) => prev.map(msg =>
        msg._id === messageId ? { ...msg, content, isEdited, editedAt } : msg
      ));
    });

    socket.on('messageDeleted', ({ messageId }) => {
      setMessages((prev) => prev.map(msg =>
        msg._id === messageId ? { ...msg, isDeleted: true, content: 'Bu mesaj silindi' } : msg
      ));
    });

    socket.on('userTyping', ({ userId, name, isTyping }) => {
      if (userId === user._id) return;
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.includes(name) ? prev : [...prev, name];
        } else {
          return prev.filter(n => n !== name);
        }
      });
    });

    return () => {
      socket.off('newMessage');
      socket.off('messageEdited');
      socket.off('messageDeleted');
      socket.off('userTyping');
    };
  }, [socket, selectedChat, user._id, setMessages]);

  // Yeni mesaj geldiğinde Scroll End
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 6. MESAJ GÖNDERME
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

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const handleInputChange = useCallback((e) => {
    setNewMessage(e.target.value);
    if (!socket || !selectedChat) return;
    socket.emit('typing', { room: selectedChat.name, isTyping: true });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { room: selectedChat.name, isTyping: false });
    }, 1500);
  }, [socket, selectedChat]);

  // Yardımcılar (UI)
  const getRoomName = (roomObj) => {
    if (roomObj.type === 'custom' || roomObj.name.startsWith('private_')) {
      const otherUser = roomObj.name.replace('private_', '').replace(user._id, '').replace('_', '');
      return otherUser === '' ? 'Kendinize Notlar' : `Kişi ID: ${otherUser}`;
    }
    return roomObj.name;
  };

  const isOwnMessage = (msg) => msg.sender?._id === user._id;

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  // Dosya Yükleme (Socket Emit)
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

  return (
    <div className="chat-page">
      {/* ── SOL PANEL: KİŞİLER & ODALAR ── */}
      <div className={`chat-sidebar ${showSidebar ? 'chat-sidebar-open' : ''}`}>

        <div className="sidebar-section">
          <div className="sidebar-header">
            <h3>Mesajlar</h3>
            <button className="hidden-desktop btn-text" onClick={() => setShowSidebar(false)}>✕</button>
          </div>

          {/* Kullanıcı Arama Inputu */}
          <div className="search-section" style={{ marginBottom: '15px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchUser}
              placeholder="Kişi ara ve seç..."
              className="search-input"
            />
            {searchQuery && (
              <div className="search-history" style={{ marginTop: '5px', maxHeight: '150px', overflowY: 'auto' }}>
                {isSearching ? <p style={{ fontSize: '12px', paddingLeft: '5px' }}>Aranıyor...</p> :
                  searchResults.map((usr) => (
                    <button key={usr._id} className="search-history-item" onClick={() => accessChat(usr._id)}>
                      {usr.name} <span style={{ fontSize: '10px', color: 'gray' }}>({usr.email})</span>
                    </button>
                  ))
                }
                {!isSearching && searchResults.length === 0 && <p style={{ fontSize: '12px', paddingLeft: '5px' }}>Bulunamadı</p>}
              </div>
            )}
          </div>

          {/* Odalarım */}
          <div className="room-list">
            {chats.length > 0 ? chats.map((c) => (
              <button
                key={c._id}
                className={`room-item ${selectedChat?._id === c._id ? 'active' : ''}`}
                onClick={() => switchRoom(c)}
              >
                <span className="room-icon">{c.icon || '💬'}</span>
                <span className="room-name">{getRoomName(c)}</span>
              </button>
            )) : (
              <p style={{ fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>Sohbet bulunamadı.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── SAĞ PANEL: CHAT ALANI ── */}
      <div className="chat-main">
        {selectedChat ? (
          <>
            {/* ODA HEADER */}
            <div className="chat-header">
              <div className="chat-room-info">
                <button className="hidden-desktop btn-text" onClick={() => setShowSidebar(true)} style={{ marginRight: '10px', fontSize: '24px' }}>☰</button>
                <span className="room-icon">{selectedChat.icon || '💬'}</span>
                <span className="room-name">{getRoomName(selectedChat)}</span>
              </div>
              <div className={`connection-status ${socketConnected ? 'connected' : 'disconnected'}`}>
                <span className="status-dot" /> {socketConnected ? 'Bağlı' : 'Bağlanıyor..'}
              </div>
            </div>

            {/* MESAJLAR */}
            <div className="messages-container" style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)' }}>
              {messages.length === 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'gray' }}>
                  Henüz mesajlaşılmamış. Merhaba deyin!
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwn = isOwnMessage(msg);
                  return (
                    <div key={msg._id} className={`message ${isOwn ? 'message-own' : 'message-other'} ${msg.isDeleted ? 'message-deleted' : ''}`}>
                      {!isOwn && (
                        <img
                          src={msg.sender?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.name || '?')}`}
                          alt="avatar"
                          className="message-avatar"
                        />
                      )}

                      <div className="message-bubble" style={{ backgroundColor: isOwn ? '#128C7E' : 'var(--bg-dashboard)', color: isOwn ? '#fff' : 'inherit' }}>
                        {!isOwn && (
                          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '3px', color: '#075E54' }}>
                            {msg.sender?.name}
                          </div>
                        )}

                        {/* İçerik */}
                        {msg.type === 'image' && msg.fileUrl && !msg.isDeleted ? (
                          <img src={msg.fileUrl.startsWith('http') ? msg.fileUrl : `${api.defaults.baseURL.replace('/api', '')}${msg.fileUrl}`} alt="" className="message-image" style={{ maxWidth: '200px', borderRadius: '10px' }} />
                        ) : msg.type === 'file' && msg.fileUrl && !msg.isDeleted ? (
                          <a href={msg.fileUrl.startsWith('http') ? msg.fileUrl : `${api.defaults.baseURL.replace('/api', '')}${msg.fileUrl}`} target="_blank" rel="noopener noreferrer" style={{ color: isOwn ? 'white' : 'blue' }}>📎 {msg.fileName}</a>
                        ) : (
                          <div className="message-content" style={{ wordBreak: 'break-word' }}>{msg.content}</div>
                        )}

                        <div className="message-meta" style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '10px', marginTop: '4px', opacity: 0.8 }}>
                          <span className="message-time">{formatTime(msg.createdAt)}</span>
                          {msg.isEdited && <span style={{ marginLeft: '5px' }}>(düzenlendi)</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {typingUsers.length > 0 && (
                <div className="typing-indicator" style={{ fontStyle: 'italic', fontSize: '12px', color: 'gray', marginTop: '10px' }}>
                  {typingUsers.join(', ')} yazıyor...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* DOSYA ÖN İZLEME */}
            {selectedFile && (
              <div style={{ padding: '10px', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📎 {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                <div>
                  <button onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ marginRight: '10px' }}>✕ İptal</button>
                  <button onClick={handleFileUpload} disabled={isUploading} className="btn-primary" style={{ padding: '5px 15px', borderRadius: '5px' }}>
                    {isUploading ? 'Yükleniyor...' : 'Gönder'}
                  </button>
                </div>
              </div>
            )}

            {/* MESAJ YAZMA ALANI */}
            <div className="chat-input-area" style={{ display: 'flex', alignItems: 'center', padding: '15px', backgroundColor: 'var(--bg-card)' }}>
              <input type="file" ref={fileInputRef} onChange={(e) => setSelectedFile(e.target.files[0])} style={{ display: 'none' }} accept="image/*,application/pdf,.doc,.docx,.txt,.zip,.rar" />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!socketConnected}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'gray', marginRight: '10px' }}
              >📎</button>

              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Bir mesaj yazın"
                style={{ flex: 1, padding: '12px 20px', borderRadius: '30px', border: 'none', outline: 'none', resize: 'none', backgroundColor: 'var(--bg-dashboard)', color: 'var(--text-primary)', height: '45px' }}
                disabled={!socketConnected}
              />

              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || !socketConnected}
                style={{ background: newMessage.trim() ? '#128C7E' : 'gray', color: '#fff', border: 'none', borderRadius: '50%', width: '45px', height: '45px', marginLeft: '10px', cursor: newMessage.trim() ? 'pointer' : 'default', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                ➤
              </button>
            </div>

          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', color: 'gray' }}>
            <h1 style={{ fontSize: '48px' }}>💬</h1>
            <h2>Sohbet Etmeye Başlayın</h2>
            <p>Sol taraftan bir kişi arayın veya mevcut bir odayı seçin.</p>
            <button className="hidden-desktop btn-primary" onClick={() => setShowSidebar(true)} style={{ marginTop: '20px', padding: '10px 20px', borderRadius: '10px' }}>Odaları Göster</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
