import React, { useState, useCallback, useEffect } from 'react';

import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import Pagination from '../components/Pagination';

const AdminPanel = () => {
  const { isModerator } = useAuth();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Kullanıcıları yükle
  const fetchUsers = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError('');
    try {
      const params = { page, limit: pagination.limit };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;

      const res = await api.get('/users', { params });
      setUsers(res.data.data.users);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Kullanıcılar yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter, pagination.limit]);

  useEffect(() => {
    fetchUsers(1);
  }, [search, roleFilter, fetchUsers]);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Rol güncelle
  const handleRoleChange = useCallback(async (userId, newRole) => {
    setActionLoading(userId);
    try {
      await api.put(`/users/${userId}`, { role: newRole });
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role: newRole } : u));
      showSuccess('Rol güncellendi');
    } catch (err) {
      setError(err.response?.data?.message || 'Güncelleme başarısız');
    } finally {
      setActionLoading(null);
    }
  }, []);

  // Aktif/pasif et
  const handleToggleActive = useCallback(async (user) => {
    setActionLoading(user._id);
    try {
      await api.put(`/users/${user._id}`, { isActive: !user.isActive });
      setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, isActive: !u.isActive } : u));
      showSuccess(`Kullanıcı ${!user.isActive ? 'aktif' : 'pasif'} edildi`);
    } catch (err) {
      setError(err.response?.data?.message || 'İşlem başarısız');
    } finally {
      setActionLoading(null);
    }
  }, []);

  // Kullanıcı sil
  const handleDelete = useCallback(async (userId, name) => {
    if (!window.confirm(`"${name}" kullanıcısını silmek istediğinizden emin misiniz?`)) return;
    setActionLoading(userId);
    try {
      await api.delete(`/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      showSuccess('Kullanıcı silindi');
    } catch (err) {
      setError(err.response?.data?.message || 'Silme başarısız');
    } finally {
      setActionLoading(null);
    }
  }, []);

  // Arama
  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const roleColors = { user: '#22c55e', moderator: '#6366f1', admin: '#f59e0b' };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>⚙️ Admin Paneli</h1>
          <p className="text-muted">Kullanıcı yönetimi</p>
        </div>
        <div className="header-stats">
          <span className="stat-badge">{pagination.total} kullanıcı</span>
        </div>
      </div>

      {/* Bildirimler */}
      {successMessage && (
        <div className="alert alert-success">✅ {successMessage}</div>
      )}
      {error && (
        <div className="alert alert-error">⚠️ {error}
          <button onClick={() => setError('')} className="alert-close">×</button>
        </div>
      )}

      {/* Filtreler */}
      <div className="filters-bar">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="İsim veya email ara..."
            className="search-input"
          />
          <button type="submit" className="btn btn-primary btn-sm">Ara</button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearch(''); setSearchInput(''); }}
              className="btn btn-ghost btn-sm"
            >
              Temizle
            </button>
          )}
        </form>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="role-select"
        >
          <option value="">Tüm Roller</option>
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Kullanıcı Tablosu */}
      <div className="table-container">
        {isLoading ? (
          <div className="table-loading">
            <div className="spinner" />
            <p>Yükleniyor...</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Kullanıcı</th>
                <th className="hide-mobile">Email</th>
                <th>Rol</th>
                <th className="hide-mobile">Durum</th>
                <th className="hide-mobile">Katılım</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id} className={!u.isActive ? 'row-inactive' : ''}>
                  <td>
                    <div className="user-cell">
                      <img
                        src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}`}
                        alt={u.name}
                        className="user-avatar-xs"
                      />
                      <span>{u.name}</span>
                    </div>
                  </td>
                  <td className="text-muted hide-mobile">{u.email}</td>
                  <td>
                    {isModerator ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u._id, e.target.value)}
                        className="role-select-inline"
                        style={{ borderColor: roleColors[u.role] }}
                        disabled={actionLoading === u._id}
                      >
                        <option value="user">user</option>
                        <option value="moderator">moderator</option>
                        <option value="admin">admin</option>
                      </select>
                    ) : (
                      <span className={`role-badge role-${u.role}`}>{u.role}</span>
                    )}
                  </td>
                  <td className="hide-mobile">
                    <span className={`status-badge ${u.isActive ? 'status-active' : 'status-inactive'}`}>
                      {u.isActive ? '● Aktif' : '○ Pasif'}
                    </span>
                  </td>
                  <td className="text-muted text-sm hide-mobile">
                    {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`btn btn-xs ${u.isActive ? 'btn-warning' : 'btn-success'}`}
                        disabled={actionLoading === u._id}
                        title={u.isActive ? 'Pasif et' : 'Aktif et'}
                      >
                        {u.isActive ? '🔒' : '🔓'}
                      </button>
                      <button
                        onClick={() => handleDelete(u._id, u.name)}
                        className="btn btn-xs btn-danger"
                        disabled={actionLoading === u._id}
                        title="Sil"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {users.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="empty-table">
                    Kullanıcı bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        pagination={pagination}
        onPageChange={(page) => fetchUsers(page)}
      />
    </div>
  );
};

export default AdminPanel;
