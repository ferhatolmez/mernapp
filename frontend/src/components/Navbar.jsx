import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Zap,
  Home,
  MessageSquare,
  Users,
  BarChart3,
  Sun,
  Moon,
  User,
  LogOut,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import NotificationBell from './NotificationBell';

const Navbar = ({ onMenuToggle }) => {
  const { user, logout, isModerator } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    toast.success('Başarıyla çıkış yapıldı');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path;

  // Dışarı tıklanınca dropdown kapat
  useEffect(() => {
    const handler = () => setMenuOpen(false);
    if (menuOpen) {
      setTimeout(() => document.addEventListener('click', handler), 0);
    }
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  return (
    <nav className="navbar">
      {/* Hamburger butonu (mobil) */}
      <button className="hamburger-btn" onClick={onMenuToggle} title="Menü">
        <span className="hamburger-line" />
        <span className="hamburger-line" />
        <span className="hamburger-line" />
      </button>

      <div className="navbar-brand">
        <Link to="/dashboard">
          <span className="brand-icon"><Zap size={20} fill="currentColor" /></span>
          <span className="brand-name">MERN App</span>
        </Link>
      </div>

      {/* Desktop Links */}
      <div className="navbar-links">
        <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
          <Home size={18} className="nav-icon-inline" /> Dashboard
        </Link>
        <Link to="/chat" className={`nav-link ${isActive('/chat') ? 'active' : ''}`}>
          <MessageSquare size={18} className="nav-icon-inline" /> Chat
        </Link>
        {isModerator && (
          <>
            <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
              <Users size={18} className="nav-icon-inline" /> Kullanıcılar
            </Link>
            <Link to="/dashboard/admin" className={`nav-link ${isActive('/dashboard/admin') ? 'active' : ''}`}>
              <BarChart3 size={18} className="nav-icon-inline" /> Dashboard
            </Link>
          </>
        )}
      </div>

      <div className="navbar-user">
        {/* Tema toggle */}
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          title={theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Bildirimler */}
        <NotificationBell />

        {/* Kullanıcı bilgisi */}
        <div className="user-dropdown" onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}>
          <img src={user?.avatar} alt={user?.name} className="user-avatar-sm" />
          <div className="user-details">
            <span className="user-name">{user?.name}</span>
            <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
          </div>
          <span className="dropdown-arrow">
            {menuOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>

          {menuOpen && (
            <div className="dropdown-menu">
              <Link to="/profile" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                <User size={16} className="dropdown-icon" /> Profilim
              </Link>
              <div className="dropdown-divider" />
              <button onClick={handleLogout} className="dropdown-item dropdown-item-danger">
                <LogOut size={16} className="dropdown-icon" /> Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
