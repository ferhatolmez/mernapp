import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.warning('Email ve şifre zorunludur');
      return;
    }
    setIsSubmitting(true);
    const result = await login(formData.email, formData.password);
    if (result.success) {
      toast.success('Hoşgeldiniz! 👋');
    } else {
      toast.error(result.message);
    }
    setIsSubmitting(false);
  };

  const fillDemo = (role) => {
    const demos = {
      admin: { email: 'admin@demo.com', password: 'Admin123!' },
      user: { email: 'user@demo.com', password: 'User123!' },
    };
    setFormData(demos[role]);
    toast.info(`${role} bilgileri dolduruldu`);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">⚡</div>
          <h1>Tekrar Hoşgeldiniz</h1>
          <p>Hesabınıza giriş yapın</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="ornek@email.com" autoComplete="email" required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Şifre</label>
            <input id="password" type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" autoComplete="current-password" required />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
            {isSubmitting ? <span className="btn-loading"><span className="spinner-sm" /> Giriş yapılıyor...</span> : 'Giriş Yap'}
          </button>
        </form>

        <div className="demo-accounts">
          <p className="demo-title">Demo Hesaplar:</p>
          <div className="demo-buttons">
            <button onClick={() => fillDemo('admin')} className="btn btn-ghost btn-sm">👑 Admin</button>
            <button onClick={() => fillDemo('user')} className="btn btn-ghost btn-sm">👤 Kullanıcı</button>
          </div>
        </div>

        <div className="auth-footer">
          <p>Hesabınız yok mu? <Link to="/register" className="auth-link">Kayıt Olun</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
