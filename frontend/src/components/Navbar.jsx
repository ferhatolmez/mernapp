import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

const Navbar = () => {
  const { user, logout, isAdmin, isModerator } = useAuth();
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

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard">
          <span className="brand-icon">⚡</span>
          <span className="brand-name">MERN App</span>
        </Link>
      </div>

      {/* Desktop Links */}
      <div className="navbar-links">
        <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
          🏠 Dashboard
        </Link>
        <Link to="/chat" className={`nav-link ${isActive('/chat') ? 'active' : ''}`}>
          💬 Chat
        </Link>
        {isModerator && (
          <>
            <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
              ⚙️ Kullanıcılar
            </Link>
            <Link to="/dashboard/admin" className={`nav-link ${isActive('/dashboard/admin') ? 'active' : ''}`}>
              📊 Dashboard
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
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Kullanıcı bilgisi */}
        <div className="user-dropdown" onClick={() => setMenuOpen(!menuOpen)}>
          <img src={user?.avatar} alt={user?.name} className="user-avatar-sm" />
          <div className="user-details">
            <span className="user-name">{user?.name}</span>
            <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
          </div>
          <span className="dropdown-arrow">{menuOpen ? '▴' : '▾'}</span>

          {menuOpen && (
            <div className="dropdown-menu">
              <Link to="/profile" className="dropdown-item" onClick={() => setMenuOpen(false)}>
                👤 Profilim
              </Link>
              <div className="dropdown-divider" />
              <button onClick={handleLogout} className="dropdown-item dropdown-item-danger">
                🚪 Çıkış Yap
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
