import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const handleChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      toast.warning('Email ve sifre zorunludur');
      return;
    }

    if (requires2FA && !/^\d{6}$/.test(twoFactorCode.trim())) {
      toast.warning('2FA kodu 6 haneli olmali');
      return;
    }

    setIsSubmitting(true);

    const result = await login(
      email,
      password,
      requires2FA ? twoFactorCode.trim() : undefined
    );

    if (result.requiresTwoFactor) {
      setRequires2FA(true);
      toast.info('Iki faktorlu dogrulama kodu gerekli');
    } else if (result.success) {
      toast.success('Hos geldiniz');
    } else {
      toast.error(result.message || 'Giris basarisiz');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">⚡</div>
          <h1>Tekrar Hosgeldiniz</h1>
          <p>Hesabiniza giris yapin</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!requires2FA ? (
            <>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="ornek@email.com"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Sifre</label>
                <div className="password-input-wrap">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Sifreyi gizle' : 'Sifreyi goster'}
                  >
                    {showPassword ? 'Gizle' : 'Goster'}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ textAlign: 'right', marginTop: '-8px' }}>
                <Link to="/forgot-password" className="auth-link" style={{ fontSize: '0.85rem' }}>
                  Sifremi Unuttum
                </Link>
              </div>
            </>
          ) : (
            <div className="form-group">
              <label htmlFor="twoFactorCode">2FA Kodu</label>
              <p className="text-muted text-sm" style={{ marginBottom: '8px' }}>
                Authenticator uygulamanizdaki 6 haneli kodu girin
              </p>
              <input
                id="twoFactorCode"
                type="text"
                value={twoFactorCode}
                onChange={(event) => {
                  const digitsOnly = event.target.value.replace(/\D/g, '').slice(0, 6);
                  setTwoFactorCode(digitsOnly);
                }}
                placeholder="000000"
                maxLength={6}
                autoFocus
                inputMode="numeric"
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em' }}
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: '8px' }}
                onClick={() => {
                  setRequires2FA(false);
                  setTwoFactorCode('');
                }}
              >
                Geri don
              </button>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="btn-loading">
                <span className="spinner-sm" />
                <span>{requires2FA ? 'Dogrulaniyor...' : 'Giris yapiliyor...'}</span>
              </span>
            ) : (
              requires2FA ? 'Dogrula' : 'Giris Yap'
            )}
          </button>
        </form>

        {!requires2FA && (
          <div className="auth-footer">
            <p>Hesabiniz yok mu? <Link to="/register" className="auth-link">Kayit Olun</Link></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
