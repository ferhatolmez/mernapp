import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const toast = useToast();

  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Avatar
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // 2FA
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret2FA, setSecret2FA] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  // ─── Profil güncelle ────────────────────────────────────────────
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await api.put('/users/profile', profileForm);
      updateUser(res.data.data.user);
      toast.success('Profil güncellendi!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Güncelleme başarısız');
    } finally {
      setIsUpdating(false);
    }
  };

  // ─── Şifre değiştir ────────────────────────────────────────────
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Şifreler eşleşmiyor');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('Şifre en az 6 karakter olmalıdır');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.put('/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Şifre başarıyla değiştirildi!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Şifre değiştirilemedi');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ─── Avatar yükle ───────────────────────────────────────────────
  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      const res = await api.put('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser(res.data.data.user);
      setAvatarFile(null);
      setAvatarPreview(null);
      toast.success('Profil fotoğrafı güncellendi!');
    } catch (err) {
      toast.error('Fotoğraf yüklenemedi');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ─── 2FA Kurulumu ───────────────────────────────────────────────
  const handleSetup2FA = async () => {
    setIsSettingUp2FA(true);
    try {
      const res = await api.post('/auth/2fa/setup');
      setQrCode(res.data.data.qrCode);
      setSecret2FA(res.data.data.secret);
      setShow2FASetup(true);
    } catch (err) {
      toast.error(err.response?.data?.message || '2FA kurulumu başarısız');
    } finally {
      setIsSettingUp2FA(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verifyCode || verifyCode.length !== 6) {
      toast.error('6 haneli kodu girin');
      return;
    }
    try {
      await api.post('/auth/2fa/verify', { code: verifyCode });
      updateUser({ twoFactorEnabled: true });
      setShow2FASetup(false);
      setVerifyCode('');
      toast.success('2FA başarıyla etkinleştirildi! 🔐');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Kod geçersiz');
    }
  };

  const handleDisable2FA = async () => {
    if (!disablePassword) {
      toast.error('Şifrenizi girin');
      return;
    }
    try {
      await api.post('/auth/2fa/disable', { password: disablePassword });
      updateUser({ twoFactorEnabled: false });
      setDisablePassword('');
      toast.success('2FA devre dışı bırakıldı');
    } catch (err) {
      toast.error(err.response?.data?.message || 'İşlem başarısız');
    }
  };

  const avatarSrc = avatarPreview || (user?.avatar?.startsWith('/') ? `${API_URL}${user.avatar}` : user?.avatar);

  return (
    <div className="page">
      <div className="page-header">
        <h1>👤 Profilim</h1>
      </div>

      <div className="profile-grid">
        {/* Avatar ve özet */}
        <div className="card profile-summary">
          <div className="avatar-upload-container">
            <img src={avatarSrc} alt={user?.name} className="profile-avatar" />
            <label className="avatar-upload-btn" title="Fotoğraf değiştir">
              📷
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarSelect}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          {avatarFile && (
            <button
              onClick={handleAvatarUpload}
              disabled={isUploadingAvatar}
              className="btn btn-primary btn-sm"
              style={{ marginTop: '8px' }}
            >
              {isUploadingAvatar ? 'Yükleniyor...' : 'Fotoğrafı Kaydet'}
            </button>
          )}
          <h2>{user?.name}</h2>
          <p className="text-muted">{user?.email}</p>
          <span className={`role-badge role-${user?.role}`}>{user?.role}</span>
          {user?.isEmailVerified !== undefined && (
            <span className={`verification-badge ${user.isEmailVerified ? 'verified' : 'unverified'}`}>
              {user.isEmailVerified ? '✅ Email Doğrulandı' : '⚠️ Email Doğrulanmadı'}
            </span>
          )}
          <p className="text-muted text-sm mt-2">
            Üye: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : '—'}
          </p>
        </div>

        <div className="profile-forms">
          {/* Profil güncelleme */}
          <div className="card">
            <h3>Profil Bilgileri</h3>
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

          {/* 2FA */}
          <div className="card">
            <h3>🔐 İki Faktörlü Doğrulama (2FA)</h3>
            <p className="text-muted text-sm" style={{ marginBottom: '16px' }}>
              Google Authenticator veya benzeri bir uygulama ile hesabınızı ekstra güvenceye alın.
            </p>

            {user?.twoFactorEnabled ? (
              <div>
                <div className="alert alert-success" style={{ marginBottom: '12px' }}>
                  ✅ 2FA aktif — Hesabınız ekstra korumalı
                </div>
                <div className="form-group">
                  <label>Devre dışı bırakmak için şifrenizi girin</label>
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Şifreniz"
                  />
                </div>
                <button onClick={handleDisable2FA} className="btn btn-ghost" style={{ color: 'var(--color-error)' }}>
                  2FA Devre Dışı Bırak
                </button>
              </div>
            ) : show2FASetup ? (
              <div className="two-fa-setup">
                <p className="text-sm" style={{ marginBottom: '12px' }}>
                  Bu QR kodunu Google Authenticator uygulamanız ile tarayın:
                </p>
                <div className="qr-code-container">
                  <img src={qrCode} alt="QR Code" className="qr-code" />
                </div>
                <p className="text-muted text-sm" style={{ marginTop: '8px' }}>
                  Manuel giriş kodu: <code style={{ wordBreak: 'break-all' }}>{secret2FA}</code>
                </p>
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>Doğrulama kodu (6 haneli)</label>
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '0.3em' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleVerify2FA} className="btn btn-primary">Doğrula ve Etkinleştir</button>
                  <button onClick={() => setShow2FASetup(false)} className="btn btn-ghost">İptal</button>
                </div>
              </div>
            ) : (
              <button onClick={handleSetup2FA} className="btn btn-primary" disabled={isSettingUp2FA}>
                {isSettingUp2FA ? 'Hazırlanıyor...' : '🔐 2FA Etkinleştir'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
