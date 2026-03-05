import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Calendar,
  Lock,
  CheckCircle2,
  XCircle,
  BarChart3,
  Smile
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      setIsLoading(true);
      api.get('/users/stats')
        .then((res) => setStats(res.data.data))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isAdmin]);

  // useMemo örneği: karşılama mesajını hesapla
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Günaydın';
    if (hour < 18) return 'İyi günler';
    return 'İyi akşamlar';
  }, []);

  // Rol renklerini hesapla
  const roleColor = useMemo(() => ({
    admin: '#f59e0b',
    moderator: '#6366f1',
    user: '#22c55e',
  }[user?.role] || '#6b7280'), [user?.role]);

  return (
    <div className="page">
      <div className="page-header">
        <div className="welcome-section">
          <img src={user?.avatar} alt={user?.name} className="user-avatar-lg" />
          <div>
            <h1>{greeting}, {user?.name}! <Smile size={28} className="nav-icon-inline" /></h1>
            <p className="text-muted">
              <span className="role-badge" style={{ backgroundColor: roleColor }}>
                {user?.role}
              </span>
              &nbsp; hesabıyla giriş yaptınız.
            </p>
          </div>
        </div>
      </div>

      {/* Kullanıcı Bilgi Kartları */}
      <div className="cards-grid">
        <div className="card">
          <div className="card-icon"><User size={24} /></div>
          <div className="card-content">
            <h3>Profil Bilgileri</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Ad:</span>
                <span>{user?.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span>{user?.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Rol:</span>
                <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Durum:</span>
                <span className="status-active">● Aktif</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-icon"><Calendar size={24} /></div>
          <div className="card-content">
            <h3>Hesap Aktivitesi</h3>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Katılım:</span>
                <span>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : '—'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Son Giriş:</span>
                <span>
                  {user?.lastLogin
                    ? new Date(user.lastLogin).toLocaleString('tr-TR')
                    : 'Bu ilk girişiniz!'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-icon"><Lock size={24} /></div>
          <div className="card-content">
            <h3>Yetkileriniz</h3>
            <div className="permissions-list">
              {[
                { label: 'Dashboard görüntüleme', allowed: true },
                { label: 'Chat kullanımı', allowed: true },
                { label: 'Kullanıcı listesi', allowed: user?.role !== 'user' },
                { label: 'Admin paneli', allowed: user?.role === 'admin' },
                { label: 'Kullanıcı silme', allowed: user?.role === 'admin' },
              ].map(({ label, allowed }) => (
                <div key={label} className="permission-item">
                  <span className={allowed ? 'perm-yes' : 'perm-no'}>
                    {allowed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  </span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Admin istatistik kartı */}
        {isAdmin && (
          <div className="card card-wide">
            <div className="card-icon"><BarChart3 size={24} /></div>
            <div className="card-content">
              <h3>Sistem İstatistikleri</h3>
              {isLoading ? (
                <div className="loading-placeholder">Yükleniyor...</div>
              ) : stats ? (
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-value">{stats.total}</span>
                    <span className="stat-label">Toplam Kullanıcı</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{stats.newToday}</span>
                    <span className="stat-label">Bugün Yeni</span>
                  </div>
                  {stats.byRole?.map((r) => (
                    <div key={r._id} className="stat-item">
                      <span className="stat-value">{r.count}</span>
                      <span className="stat-label">{r._id}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
