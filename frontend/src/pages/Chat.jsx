import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Paperclip,
  Search,
  X,
  User,
  ArrowLeft,
  Edit2,
  Trash2,
  Check,
  Hash,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';
import EmptyState from '../components/EmptyState';

const MAX_MESSAGE_LENGTH = 1000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const LAST_CHAT_STORAGE_KEY = 'chat:lastRoomId';

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-rar-compressed',
]);

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

  const [editingMsg, setEditingMsg] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [activeMessageId, setActiveMessageId] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [chatsError, setChatsError] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState('');

  const [showSidebar, setShowSidebar] = useState(() => window.innerWidth > 768);

  const searchTimerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  const fetchChats = useCallback(async () => {
    setIsLoadingChats(true);
    setChatsError('');

    try {
      const { data } = await api.get('/chat/');
      setChats(data.data.rooms || []);
    } catch (error) {
      setChatsError('Sohbet listesi yuklenemedi.');
    } finally {
      setIsLoadingChats(false);
    }
  }, [setChats]);

  const fetchMessagesForRoom = useCallback(async (roomObj) => {
    if (!roomObj?.name) return;

    setIsLoadingMessages(true);
    setMessagesError('');

    try {
      const { data } = await api.get(`/chat/messages?room=${encodeURIComponent(roomObj.name)}&limit=50`);
      setMessages(data.data.messages || []);
    } catch (error) {
      setMessages([]);
      setMessagesError('Mesajlar yuklenemedi. Lutfen tekrar deneyin.');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [setMessages]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    if (!selectedChat?._id) return;
    localStorage.setItem(LAST_CHAT_STORAGE_KEY, selectedChat._id);
  }, [selectedChat]);

  useEffect(() => {
    if (!chats.length || selectedChat) return;

    const lastRoomId = localStorage.getItem(LAST_CHAT_STORAGE_KEY);
    if (!lastRoomId) return;

    const room = chats.find((chatRoom) => chatRoom._id === lastRoomId);
    if (!room) return;

    setSelectedChat(room);
    if (socket) {
      socket.emit('joinRoom', room.name);
    }
    fetchMessagesForRoom(room);
  }, [chats, selectedChat, setSelectedChat, fetchMessagesForRoom, socket]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setShowSidebar(true);
      } else if (!selectedChat) {
        setShowSidebar(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedChat]);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;

    if (window.innerWidth <= 768) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (window.innerWidth <= 768 && selectedChat && !window.location.hash.includes('chat')) {
        setSelectedChat(null);
        setShowSidebar(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedChat, setSelectedChat]);

  useEffect(() => {
    return () => {
      clearTimeout(searchTimerRef.current);
      clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const handleSwitchRoom = useCallback((roomObj) => {
    if (!roomObj) return;
    if (selectedChat?._id === roomObj._id) return;

    if (window.innerWidth <= 768 && !window.location.hash.includes('chat')) {
      window.history.pushState(null, '', window.location.pathname + window.location.search + '#chat');
    }

    if (selectedChat && socket) {
      socket.emit('leaveRoom', selectedChat.name);
    }

    setSelectedChat(roomObj);
    setMessages([]);
    setMessagesError('');

    if (socket) {
      socket.emit('joinRoom', roomObj.name);
    }

    setShowSidebar(false);
    fetchMessagesForRoom(roomObj);
  }, [selectedChat, socket, setMessages, setSelectedChat, fetchMessagesForRoom]);

  useEffect(() => {
    if (!socket || !selectedChat?.name) return;
    socket.emit('joinRoom', selectedChat.name);
  }, [socket, selectedChat?.name]);

  const accessChat = async (targetUserId) => {
    try {
      const { data } = await api.post('/chat/access', { userId: targetUserId });
      const room = data.data.room;

      if (!chats.find((chatRoom) => chatRoom._id === room._id)) {
        setChats((prev) => [room, ...prev]);
      }

      handleSwitchRoom(room);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sohbete erisilemedi');
    }
  };

  const handleSearchUser = (event) => {
    const query = event.target.value;
    setSearchQuery(query);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      clearTimeout(searchTimerRef.current);
      return;
    }

    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const { data } = await api.get(`/users/search?q=${encodeURIComponent(trimmed)}&limit=10`);
        setSearchResults(data.data.users || []);
      } catch (error) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      if (selectedChat && message.room === selectedChat.name) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const handleMessageEdited = ({ messageId, content, isEdited, editedAt }) => {
      setMessages((prev) => prev.map((msg) => (
        msg._id === messageId ? { ...msg, content, isEdited, editedAt } : msg
      )));
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.map((msg) => (
        msg._id === messageId
          ? { ...msg, isDeleted: true, content: 'Bu mesaj silindi' }
          : msg
      )));
    };

    const handleUserTyping = ({ userId, name, isTyping }) => {
      if (userId === user._id) return;

      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.includes(name) ? prev : [...prev, name];
        }
        return prev.filter((typingName) => typingName !== name);
      });
    };

    const handleSocketError = (payload) => {
      if (payload?.message) {
        toast.error(payload.message);
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('messageEdited', handleMessageEdited);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('userTyping', handleUserTyping);
    socket.on('error', handleSocketError);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('messageEdited', handleMessageEdited);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('userTyping', handleUserTyping);
      socket.off('error', handleSocketError);
    };
  }, [socket, selectedChat, user._id, setMessages, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const sendMessage = useCallback(() => {
    if (!selectedChat || !socket || !socketConnected || isUploading) return;

    const content = newMessage.trim();
    if (!content) return;

    socket.emit('sendMessage', {
      content,
      room: selectedChat.name,
      type: 'text',
    });

    setNewMessage('');

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.focus();
    }
  }, [newMessage, socket, socketConnected, selectedChat, isUploading]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const handleInputChange = useCallback((event) => {
    const value = event.target.value;
    setNewMessage(value);

    event.target.style.height = 'auto';
    event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;

    if (!socket || !selectedChat) return;

    socket.emit('typing', { room: selectedChat.name, isTyping: true });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', { room: selectedChat.name, isTyping: false });
    }, 1200);
  }, [socket, selectedChat]);

  const handleEditMessage = useCallback(() => {
    if (!editingMsg || !socket || !selectedChat) return;

    const content = editContent.trim();
    if (!content || content.length > MAX_MESSAGE_LENGTH) return;

    socket.emit('editMessage', {
      messageId: editingMsg._id,
      content,
      room: selectedChat.name,
    });

    setEditingMsg(null);
    setEditContent('');
  }, [editingMsg, editContent, socket, selectedChat]);

  const handleDeleteMessage = useCallback((messageId) => {
    if (!socket || !selectedChat) return;

    socket.emit('deleteMessage', {
      messageId,
      room: selectedChat.name,
    });
  }, [socket, selectedChat]);

  const resetSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Dosya boyutu 10MB sinirini asamaz.');
      event.target.value = '';
      return;
    }

    const isImage = file.type.startsWith('image/');
    if (!isImage && !allowedMimeTypes.has(file.type)) {
      toast.error('Bu dosya tipi desteklenmiyor.');
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
  };

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

      resetSelectedFile();
      toast.success('Dosya gonderildi');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Dosya yuklenemedi');
    } finally {
      setIsUploading(false);
    }
  };

  const getChatDisplayName = (roomObj) => {
    if (!roomObj) return '';

    if (roomObj.type === 'private' && roomObj.members && roomObj.members.length > 0) {
      const otherMember = roomObj.members.find((member) => {
        const memberId = (member._id || member).toString();
        return memberId !== user._id;
      });

      if (otherMember?.name) return otherMember.name;
    }

    if (roomObj.name?.startsWith('private_')) {
      return 'Ozel Sohbet';
    }

    return roomObj.name || 'Oda';
  };

  const getChatAvatar = (roomObj) => {
    if (roomObj?.type === 'private' && roomObj.members) {
      const otherMember = roomObj.members.find((member) => {
        const memberId = (member._id?.toString?.() || member.toString());
        return memberId !== user._id;
      });

      if (otherMember?.avatar) return otherMember.avatar;
      if (otherMember?.name) {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(otherMember.name)}&background=f97316&color=fff&size=40`;
      }
    }

    return null;
  };

  const getChatIcon = (roomObj) => {
    if (roomObj?.type === 'private') return <User size={20} />;
    return <Hash size={20} />;
  };

  const isOwnMessage = (msg) => msg.sender?._id === user._id;

  const formatTime = (date) => new Date(date).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const canSendMessage = Boolean(newMessage.trim()) && socketConnected && !isUploading;

  return (
    <div className="chat-page">
      <div className={`chat-sidebar ${showSidebar ? 'chat-sidebar-open' : ''}`}>
        <div className="sidebar-section">
          <div className="sidebar-header">
            <h3><MessageSquare size={20} className="nav-icon-inline" /> Mesajlar</h3>
            <button className="hidden-desktop btn-text" onClick={() => setShowSidebar(false)} aria-label="Paneli kapat">
              <X size={20} />
            </button>
          </div>

          <div className="search-section" style={{ marginBottom: '12px' }}>
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchUser}
                placeholder="Kisi ara..."
                className="search-input"
                aria-label="Kullanici ara"
              />
            </div>

            {searchQuery && (
              <div className="search-history" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                {searchQuery.trim().length < 2 ? (
                  <p className="chat-info-message">Arama icin en az 2 karakter yazin</p>
                ) : isSearching ? (
                  <p className="chat-info-message">Araniyor...</p>
                ) : searchResults.length > 0 ? (
                  searchResults.map((searchUser) => (
                    <button
                      key={searchUser._id}
                      className="search-history-item"
                      onClick={() => accessChat(searchUser._id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                    >
                      <img
                        src={searchUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(searchUser.name)}&size=28&background=f97316&color=fff`}
                        alt={searchUser.name}
                        onError={(event) => {
                          event.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(searchUser.name)}&size=28&background=f97316&color=fff`;
                        }}
                        style={{ width: 28, height: 28, borderRadius: '50%' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>{searchUser.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{searchUser.email}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="chat-info-message">Kullanici bulunamadi</p>
                )}
              </div>
            )}
          </div>

          <div className="room-list">
            {isLoadingChats ? (
              <p className="chat-info-message">Sohbet listesi yukleniyor...</p>
            ) : chatsError ? (
              <div className="chat-inline-error">
                <p>{chatsError}</p>
                <button onClick={fetchChats} className="btn btn-ghost btn-sm">Tekrar dene</button>
              </div>
            ) : chats.length > 0 ? (
              chats.map((chatRoom) => {
                const avatar = getChatAvatar(chatRoom);

                return (
                  <button
                    key={chatRoom._id}
                    className={`room-item ${selectedChat?._id === chatRoom._id ? 'active' : ''}`}
                    onClick={() => handleSwitchRoom(chatRoom)}
                  >
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={getChatDisplayName(chatRoom)}
                        onError={(event) => {
                          event.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getChatDisplayName(chatRoom))}&size=36&background=f97316&color=fff`;
                        }}
                        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span className="room-icon">{getChatIcon(chatRoom)}</span>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span className="room-name">{getChatDisplayName(chatRoom)}</span>
                      {chatRoom.description && chatRoom.type !== 'private' && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {chatRoom.description}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="chat-info-message">Henuz sohbet yok. Yukaridan kisi arayarak baslayin.</p>
            )}
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-header">
            <h3>Online</h3>
            <span className="online-count">{onlineUsers.length}</span>
          </div>

          <div className="online-list">
            {onlineUsers.length > 0 ? (
              onlineUsers.map((onlineUser) => (
                <div
                  key={onlineUser.userId}
                  className="online-user"
                  style={{ cursor: 'pointer' }}
                  onClick={() => accessChat(onlineUser.userId)}
                >
                  <div className="online-dot" />
                  <img
                    src={onlineUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(onlineUser.name)}&size=28&background=128C7E&color=fff`}
                    alt={onlineUser.name}
                    className="user-avatar-xs"
                    onError={(event) => {
                      event.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(onlineUser.name)}&size=28&background=128C7E&color=fff`;
                    }}
                  />
                  <span>{onlineUser.name}</span>
                </div>
              ))
            ) : (
              <p className="text-muted text-sm">Cevrimici kimse yok</p>
            )}
          </div>
        </div>
      </div>

      <div className="chat-main">
        {selectedChat ? (
          <>
            <div className="chat-header">
              <div className="chat-room-info">
                <button
                  className="hidden-desktop"
                  onClick={() => {
                    if (window.location.hash.includes('chat')) {
                      window.history.back();
                    } else {
                      setSelectedChat(null);
                      setShowSidebar(true);
                    }
                  }}
                  style={{
                    marginRight: '10px',
                    width: '40px',
                    height: '40px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '50%',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title="Sohbet listesine don"
                  aria-label="Sohbet listesine don"
                >
                  <ArrowLeft size={20} />
                </button>

                {getChatAvatar(selectedChat) ? (
                  <img
                    src={getChatAvatar(selectedChat)}
                    alt={getChatDisplayName(selectedChat)}
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
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{selectedChat.description}</div>
                  )}
                </div>
              </div>

              <div className={`connection-status ${socketConnected ? 'connected' : 'disconnected'}`}>
                <span className="status-dot" />
                {socketConnected ? 'Bagli' : 'Baglaniyor...'}
              </div>
            </div>

            <div className="messages-container">
              {isLoadingMessages ? (
                <div className="messages-loading">Mesajlar yukleniyor...</div>
              ) : messagesError ? (
                <div className="chat-inline-error">
                  <p>{messagesError}</p>
                  <button onClick={() => fetchMessagesForRoom(selectedChat)} className="btn btn-ghost btn-sm">Tekrar dene</button>
                </div>
              ) : messages.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="Mesaj Yok"
                  description="Henuz mesaj yok. Ilk mesaji siz gonderin."
                />
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
                          src={msg.sender?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.sender?.name || '?')}&size=32&background=a78bfa&color=fff`}
                          alt={msg.sender?.name || 'Kullanici'}
                          className="message-avatar"
                        />
                      )}

                      <div
                        className="message-bubble"
                        onClick={() => isOwn && setActiveMessageId((prev) => (prev === msg._id ? null : msg._id))}
                      >
                        {!isOwn && (
                          <div className="message-sender">
                            <span className="sender-name">{msg.sender?.name}</span>
                          </div>
                        )}

                        {editingMsg?._id === msg._id ? (
                          <div className="message-edit-form">
                            <input
                              type="text"
                              value={editContent}
                              onChange={(event) => setEditContent(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') handleEditMessage();
                                if (event.key === 'Escape') {
                                  setEditingMsg(null);
                                  setEditContent('');
                                }
                              }}
                              autoFocus
                              maxLength={MAX_MESSAGE_LENGTH}
                            />
                            <div className="message-edit-actions">
                              <button onClick={handleEditMessage} className="btn-text" aria-label="Kaydet">
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingMsg(null);
                                  setEditContent('');
                                }}
                                className="btn-text"
                                aria-label="Iptal"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {msg.type === 'image' && msg.fileUrl && !msg.isDeleted ? (
                              <img src={msg.fileUrl} alt={msg.fileName || 'Gorsel'} className="message-image" />
                            ) : msg.type === 'file' && msg.fileUrl && !msg.isDeleted ? (
                              <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="message-file">
                                <Paperclip size={16} /> {msg.fileName}
                              </a>
                            ) : (
                              <div className="message-content">{msg.content}</div>
                            )}
                          </>
                        )}

                        <div className="message-meta">
                          <span className="message-time">{formatTime(msg.createdAt)}</span>
                          {msg.isEdited && <span className="message-edited">(duzenlendi)</span>}
                        </div>

                        {!msg.isDeleted && isOwn && !editingMsg && (
                          <div className={`message-actions ${activeMessageId === msg._id ? 'active' : ''}`}>
                            <button
                              onClick={() => {
                                setEditingMsg(msg);
                                setEditContent(msg.content);
                              }}
                              className="message-action-btn"
                              title="Duzenle"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(msg._id)}
                              className="message-action-btn"
                              title="Sil"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}

                        {!msg.isDeleted && !isOwn && ['admin', 'moderator'].includes(user.role) && (
                          <div className="message-actions">
                            <button
                              onClick={() => handleDeleteMessage(msg._id)}
                              className="message-action-btn"
                              title="Sil"
                            >
                              <Trash2 size={14} />
                            </button>
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
                  <span className="typing-text">{typingUsers.join(', ')} yaziyor...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {selectedFile && (
              <div className="file-preview">
                <span className="file-preview-name"><Paperclip size={14} /> {selectedFile.name}</span>
                <span className="file-preview-size">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                <button onClick={resetSelectedFile} className="file-preview-remove" aria-label="Dosyayi kaldir">
                  <X size={14} />
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={isUploading}
                  className="send-btn"
                  style={{ width: 'auto', borderRadius: '8px', padding: '6px 16px', fontSize: '0.85rem' }}
                >
                  {isUploading ? 'Yukleniyor...' : 'Gonder'}
                </button>
              </div>
            )}

            <div className="chat-input-area">
              <div className="chat-input-wrapper">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  accept="image/*,application/pdf,.doc,.docx,.txt,.zip,.rar"
                />

                <button
                  className="chat-file-btn"
                  onClick={() => fileInputRef.current?.click()}
                  title="Dosya gonder"
                  disabled={!socketConnected || isUploading}
                >
                  <Paperclip size={20} />
                </button>

                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Bir mesaj yazin..."
                  className="chat-input"
                  rows={1}
                  maxLength={MAX_MESSAGE_LENGTH}
                  disabled={!socketConnected}
                />

                <div className="input-actions">
                  <span className="char-count">{newMessage.length}/{MAX_MESSAGE_LENGTH}</span>
                  <button onClick={sendMessage} disabled={!canSendMessage} className="send-btn" aria-label="Mesaji gonder">
                    <Send size={18} />
                  </button>
                </div>
              </div>

              <p className="chat-hint">Enter ile gonder • Shift+Enter ile yeni satir • Dosya limiti: 10MB</p>
            </div>
          </>
        ) : (
          <div className="empty-chat" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <EmptyState
              icon={MessageSquare}
              title="Sohbet"
              description="Sol panelden bir kisi arayarak veya mevcut bir sohbete tiklayarak mesajlasmaya baslayin."
            />

            <button
              className="hidden-desktop"
              onClick={() => setShowSidebar(true)}
              style={{
                marginTop: '-10px',
                padding: '12px 24px',
                borderRadius: '24px',
                background: 'var(--gradient-primary)',
                border: 'none',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              Sohbetleri Goster
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;



