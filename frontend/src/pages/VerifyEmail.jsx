import React, { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api from '../utils/api';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const toast = useToast();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');
    const hasVerified = useRef(false);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Geçersiz veya eksik doğrulama linki.');
            return;
        }

        const verifyEmailToken = async () => {
            if (hasVerified.current) return;
            hasVerified.current = true;
            try {
                const response = await api.post('/auth/verify-email', { token });
                setStatus('success');
                setMessage(response.data.message || 'Email adresiniz başarıyla doğrulandı.');
                toast.success('Email başarıyla doğrulandı! Giriş yapabilirsiniz.');
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Email doğrulama başarısız oldu veya linkin süresi dolmuş.');
                toast.error(err.response?.data?.message || 'Email doğrulanamadı');
            }
        };

        verifyEmailToken();
    }, [token, navigate, toast]);

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">
                        {status === 'verifying' && '⏳'}
                        {status === 'success' && '✅'}
                        {status === 'error' && '❌'}
                    </div>
                    <h1>Email Doğrulama</h1>
                </div>

                <div className="auth-form" style={{ textAlign: 'center', margin: '20px 0' }}>
                    {status === 'verifying' && (
                        <div>
                            <p>Email adresiniz doğrulanıyor, lütfen bekleyin...</p>
                            <div className="spinner-sm" style={{ margin: '20px auto', display: 'block' }}></div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div>
                            <p style={{ color: '#22c55e', marginBottom: '15px' }}>{message}</p>
                            <p>3 saniye içinde giriş sayfasına yönlendirileceksiniz...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div>
                            <p style={{ color: '#ef4444', marginBottom: '15px' }}>{message}</p>
                        </div>
                    )}
                </div>

                <div className="auth-footer">
                    <p>
                        {status === 'success' ? (
                            <Link to="/login" className="auth-link">Hemen Giriş Yap</Link>
                        ) : (
                            <Link to="/login" className="auth-link">← Giriş sayfasına dön</Link>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
