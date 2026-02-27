import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sent, setSent] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            toast.warning('Email adresi zorunludur');
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/auth/forgot-password', { email });
            setSent(true);
            toast.success('Şifre sıfırlama linki gönderildi!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Bir hata oluştu');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (sent) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo">📧</div>
                        <h1>Email Gönderildi!</h1>
                        <p>Şifre sıfırlama linki email adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.</p>
                    </div>
                    <div className="auth-footer">
                        <p><Link to="/login" className="auth-link">← Giriş sayfasına dön</Link></p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">🔐</div>
                    <h1>Şifremi Unuttum</h1>
                    <p>Email adresinizi girin, şifre sıfırlama linki göndereceğiz</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ornek@email.com"
                            autoComplete="email"
                            required
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <span className="btn-loading"><span className="spinner-sm" /> Gönderiliyor...</span>
                        ) : 'Sıfırlama Linki Gönder'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p>Şifrenizi hatırladınız? <Link to="/login" className="auth-link">Giriş Yapın</Link></p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
