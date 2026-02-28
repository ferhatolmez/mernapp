import React, { useState, useEffect } from 'react';

const PwaInstallPrompt = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIos, setIsIos] = useState(false);

    useEffect(() => {
        // Sadece daha önce kapatmadıysa göster
        const promptClosed = localStorage.getItem('pwaPromptClosed');
        if (promptClosed) return;

        // Cihaz platform kontrolü
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);

        // Uygulama PWA olarak yüklü mü? (standalone mod)
        const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);

        if (isIosDevice && !isInStandaloneMode) {
            setIsIos(true);
            // Kısa bir süre sonra göster ki kullanıcı siteyi biraz görsün
            const timer = setTimeout(() => setShowPrompt(true), 3000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setShowPrompt(false);
        localStorage.setItem('pwaPromptClosed', 'true');
    };

    if (!showPrompt || !isIos) return null;

    return (
        <div className="pwa-ios-prompt">
            <div className="pwa-ios-content">
                <button className="pwa-ios-close" onClick={handleClose}>✕</button>
                <div className="pwa-ios-header">
                    <img src="/icon-512.png" alt="MERN App" className="pwa-ios-icon" />
                    <div>
                        <h3>Uygulamayı Yükle</h3>
                        <p>Daha iyi bir deneyim için ana ekrana ekleyin.</p>
                    </div>
                </div>
                <div className="pwa-ios-steps">
                    <p>
                        1. Alt menüden <strong>Paylaş</strong> <span className="pwa-share-icon">📤</span> butonuna dokunun.
                    </p>
                    <p>
                        2. Listeyi aşağı kaydırıp <strong>Ana Ekrana Ekle</strong> (Add to Home Screen) seçeneğini seçin.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PwaInstallPrompt;
