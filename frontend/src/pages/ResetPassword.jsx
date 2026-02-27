import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const toast = useToast();

    const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.password.length < 6) {
            toast.warning('Şifre en az 6 karakter olmalıdır');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            toast.warning('Şifreler eşleşmiyor');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/auth/reset-password', {
                token,
                password: formData.password,
            });
            toast.success('Şifre başarıyla sıfırlandı! Giriş yapabilirsiniz.');
            navigate('/login');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Şifre sıfırlanamadı');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!token) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo">⚠️</div>
                        <h1>Geçersiz Link</h1>
                        <p>Şifre sıfırlama linki geçersiz veya süresi dolmuş.</p>
                    </div>
                    <div className="auth-footer">
                        <p><Link to="/forgot-password" className="auth-link">Yeni link talep edin</Link></p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">🔑</div>
                    <h1>Yeni Şifre Belirle</h1>
                    <p>Yeni şifrenizi girin</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label>Yeni Şifre</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                            placeholder="En az 6 karakter"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Şifre Tekrar</label>
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
                            placeholder="Şifrenizi tekrar girin"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <span className="btn-loading"><span className="spinner-sm" /> Sıfırlanıyor...</span>
                        ) : 'Şifreyi Sıfırla'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p><Link to="/login" className="auth-link">← Giriş sayfasına dön</Link></p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
