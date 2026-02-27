import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const Profile = () => {
  const { user, updateUser } = useAuth();

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileStatus, setProfileStatus] = useState({ type: '', message: '' });
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const showStatus = (setter, type, message) => {
    setter({ type, message });
    setTimeout(() => setter({ type: '', message: '' }), 4000);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await api.put('/users/profile', profileForm);
      updateUser(res.data.data.user);
      showStatus(setProfileStatus, 'success', 'Profil güncellendi!');
    } catch (err) {
      showStatus(setProfileStatus, 'error', err.response?.data?.message || 'Güncelleme başarısız');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showStatus(setPasswordStatus, 'error', 'Şifreler eşleşmiyor');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showStatus(setPasswordStatus, 'error', 'Şifre en az 6 karakter olmalıdır');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.put('/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showStatus(setPasswordStatus, 'success', 'Şifre başarıyla değiştirildi!');
    } catch (err) {
      showStatus(setPasswordStatus, 'error', err.response?.data?.message || 'Şifre değiştirilemedi');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>👤 Profilim</h1>
      </div>

      <div className="profile-grid">
        {/* Avatar ve özet */}
        <div className="card profile-summary">
          <img src={user?.avatar} alt={user?.name} className="profile-avatar" />
          <h2>{user?.name}</h2>
          <p className="text-muted">{user?.email}</p>
          <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
          <p className="text-muted text-sm mt-2">
            Üye: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : '—'}
          </p>
        </div>

        <div className="profile-forms">
          {/* Profil güncelleme */}
          <div className="card">
            <h3>Profil Bilgileri</h3>
            {profileStatus.message && (
              <div className={`alert alert-${profileStatus.type}`}>
                {profileStatus.type === 'success' ? '✅' : '⚠️'} {profileStatus.message}
              </div>
            )}
            <form onSubmit={handleProfileUpdate} className="form-vertical">
              <div className="form-group">
                <label>Ad Soyad</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={isUpdating}>
                {isUpdating ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </form>
          </div>

          {/* Şifre değiştirme */}
          <div className="card">
            <h3>Şifre Değiştir</h3>
            {passwordStatus.message && (
              <div className={`alert alert-${passwordStatus.type}`}>
                {passwordStatus.type === 'success' ? '✅' : '⚠️'} {passwordStatus.message}
              </div>
            )}
            <form onSubmit={handlePasswordChange} className="form-vertical">
              <div className="form-group">
                <label>Mevcut Şifre</label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Yeni Şifre</label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Yeni Şifre Tekrar</label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={isChangingPassword}>
                {isChangingPassword ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
