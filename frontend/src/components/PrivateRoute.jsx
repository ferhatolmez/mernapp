import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── Giriş gerektiren sayfalar için ──────────────────────────────
export const PrivateRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Yükleniyor...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Giriş sonrası geri dön için mevcut path'i kaydet
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// ─── Rol gerektiren sayfalar için ─────────────────────────────────
export const RoleRoute = ({ children, roles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
