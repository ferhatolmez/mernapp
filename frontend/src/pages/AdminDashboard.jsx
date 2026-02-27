import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../utils/api';
import { SkeletonStat } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';

// ─── Renkler ─────────────────────────────────────────────────────
const COLORS = ['#7c6af8', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'];

// ─── Stat Kutusu ─────────────────────────────────────────────────
const StatCard = ({ icon, label, value, change, color }) => (
  <div className="stat-card" style={{ borderLeftColor: color }}>
    <div className="stat-card-icon" style={{ background: `${color}20`, color }}>{icon}</div>
    <div className="stat-card-body">
      <span className="stat-card-value">{value ?? '—'}</span>
      <span className="stat-card-label">{label}</span>
      {change !== undefined && (
        <span className={`stat-card-change ${change >= 0 ? 'positive' : 'negative'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% bu ay
        </span>
      )}
    </div>
  </div>
);

// ─── Özel Tooltip ─────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── ANA DASHBOARD ────────────────────────────────────────────────
const AdminDashboard = () => {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Son 7 günün kayıt verisi (mock — gerçek veriyle değiştirilecek)
  const registrationData = [
    { gun: 'Pzt', kayit: 4, aktif: 3 },
    { gun: 'Sal', kayit: 7, aktif: 6 },
    { gun: 'Çar', kayit: 3, aktif: 3 },
    { gun: 'Per', kayit: 9, aktif: 7 },
    { gun: 'Cum', kayit: 12, aktif: 10 },
    { gun: 'Cmt', kayit: 6, aktif: 5 },
    { gun: 'Paz', kayit: 8, aktif: 7 },
  ];

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/users/stats'),
        api.get('/users', { params: { limit: 5, sort: '-createdAt' } }),
      ]);
      setStats(statsRes.data.data);
      setUsers(usersRes.data.data.users);
    } catch (err) {
      toast.error('Veriler yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Rol dağılımı pie chart verisi
  const roleData = stats?.byRole?.map(r => ({
    name: r._id, value: r.count
  })) || [];

  const tabs = ['overview', 'kullanicilar', 'aktivite'];

  return (
    <div className="page">
      {/* ─── Header ─── */}
      <div className="page-header">
        <div>
          <h1>📊 Admin Dashboard</h1>
          <p className="text-muted">Sistem genel görünümü</p>
        </div>
        <button onClick={fetchData} className="btn btn-outline btn-sm">
          🔄 Yenile
        </button>
      </div>

      {/* ─── Tabs ─── */}
      <div className="dashboard-tabs">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === 'overview' && (
        <>
          {/* Stat Kartları */}
          <div className="stat-cards-grid">
            {isLoading ? (
              Array(4).fill(0).map((_, i) => <SkeletonStat key={i} />)
            ) : (
              <>
                <StatCard icon="👥" label="Toplam Kullanıcı" value={stats?.total} change={12} color="#7c6af8" />
                <StatCard icon="🆕" label="Bugün Yeni" value={stats?.newToday} color="#22c55e" />
                <StatCard icon="👑" label="Admin Sayısı" value={stats?.byRole?.find(r => r._id === 'admin')?.count || 0} color="#f59e0b" />
                <StatCard icon="✅" label="Aktif Kullanıcı" value={stats?.byRole?.reduce((a, r) => a + r.activeCount, 0)} color="#06b6d4" />
              </>
            )}
          </div>

          {/* Grafikler */}
          <div className="charts-grid">
            {/* Kayıt Grafiği */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Son 7 Gün Kayıt</h3>
                <span className="chart-badge">Haftalık</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={registrationData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="gun" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="kayit" stroke="#7c6af8" strokeWidth={2.5} dot={{ fill: '#7c6af8', r: 4 }} name="Kayıt" />
                  <Line type="monotone" dataKey="aktif" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 4 }} name="Aktif" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Rol Dağılımı */}
            <div className="chart-card">
              <div className="chart-header">
                <h3>Rol Dağılımı</h3>
                <span className="chart-badge">Toplam</span>
              </div>
              {roleData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={roleData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {roleData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val, name) => [val, name]} />
                    <Legend formatter={(val) => <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{val}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">Veri yok</div>
              )}
            </div>

            {/* Bar Chart */}
            <div className="chart-card chart-full">
              <div className="chart-header">
                <h3>Günlük Aktivite</h3>
                <span className="chart-badge">Bu Hafta</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={registrationData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="gun" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="kayit" fill="#7c6af8" radius={[6, 6, 0, 0]} name="Kayıt" />
                  <Bar dataKey="aktif" fill="#22c55e" radius={[6, 6, 0, 0]} name="Aktif" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* ═══ KULLANICILAR TAB ═══ */}
      {activeTab === 'kullanicilar' && (
        <div className="card">
          <h3>Son Kayıt Olan Kullanıcılar</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Durum</th>
                <th>Tarih</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    {Array(5).fill(0).map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 14, borderRadius: 4 }} /></td>
                    ))}
                  </tr>
                ))
              ) : users.map(u => (
                <tr key={u._id}>
                  <td>
                    <div className="user-cell">
                      <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}`} alt={u.name} className="user-avatar-xs" />
                      <span>{u.name}</span>
                    </div>
                  </td>
                  <td className="text-muted">{u.email}</td>
                  <td><span className={`role-badge role-${u.role}`}>{u.role}</span></td>
                  <td><span className={u.isActive ? 'status-active' : 'status-inactive'}>{u.isActive ? '● Aktif' : '○ Pasif'}</span></td>
                  <td className="text-muted text-sm">{new Date(u.createdAt).toLocaleDateString('tr-TR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ AKTİVİTE TAB ═══ */}
      {activeTab === 'aktivite' && (
        <div className="activity-feed">
          <h3>Son Aktiviteler</h3>
          {[
            { icon: '👤', text: 'Yeni kullanıcı kaydoldu', time: '2 dakika önce', color: '#7c6af8' },
            { icon: '🔐', text: 'Admin girişi yapıldı', time: '15 dakika önce', color: '#f59e0b' },
            { icon: '💬', text: 'Genel odaya 24 mesaj gönderildi', time: '1 saat önce', color: '#22c55e' },
            { icon: '🔒', text: 'Kullanıcı hesabı pasif edildi', time: '3 saat önce', color: '#ef4444' },
            { icon: '✏️', text: 'Rol güncellendi: user → moderator', time: '5 saat önce', color: '#06b6d4' },
          ].map((item, i) => (
            <div key={i} className="activity-item" style={{ '--delay': `${i * 0.08}s` }}>
              <div className="activity-icon" style={{ background: `${item.color}20`, color: item.color }}>
                {item.icon}
              </div>
              <div className="activity-content">
                <p>{item.text}</p>
                <span className="text-muted text-sm">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
