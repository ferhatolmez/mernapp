# 🚀 MERN Stack Mini Web Sohbet & Dashboard

Bu uygulama, **MERN Stack (MongoDB, Express, React, Node.js)** kullanılarak geliştirilmiş, modern bir kullanıcı arayüzüne sahip gerçek zamanlı mesajlaşma ve yönetim paneli uygulamasıdır.

## 🌟 Öne Çıkan Özellikler

### 💬 Gerçek Zamanlı Sohbet (Mini Web Sohbet)
*   **Socket.io Entegrasyonu:** Kesintisiz, anlık ve düşük gecikmeli haberleşme.
*   **Özel ve Genel Odalar:** Birebir özel sohbetler ve genel tartışma odaları (Yazılım, Tasarım, Rastgele).
*   **Modern Arayüz:** Tamamen yenilenmiş, "Turuncu & Mor" konseptli şık ve pürüzsüz arayüz (Glassmorphism esintileri).
*   **Mesaj Aksiyonları:** Gönderilen mesajları anında *düzenleme* ve *silme* seçenekleri.
*   **Çevrimiçi Takibi:** Sol menüde o an çevrimiçi olan kişilerin listesi ve "Yazıyor..." bildirimleri.
*   **Dosya/Resim Paylaşımı:** Sürükle bırak veya buton ile sohbete resim ve döküman yükleme.
*   **Mobil Uyum (Responsive):** Mobilde taşmayan, sidebar'ı tam ekran açılan kusursuz ekran deneyimi. Kalınlaşmış, dokunmatik dostu aksiyon butonları.

### 🛡️ Güvenlik ve Kimlik Doğrulama
*   **JWT & Refresh Token:** Güvenli ve kalıcı oturum yönetimi.
*   **İki Aşamalı Doğrulama (2FA):** Google Authenticator gibi araçlarla desteklenen 2FA güvenlik altyapısı.
*   **E-posta Doğrulama:** Kayıt sonrası e-posta onayı (NodeMailer).
*   **Şifre Sıfırlama:** Unutulan şifreler için sihirli bağlantılar.
*   **Rate Limiting ve CORS:** Güvenlik sıkılaştırmaları.

### 📊 Yönetim ve Dashboard
*   **Kapsamlı Profil Yönetimi:** Kullanıcı fotoğraf (avatar) yükleme, bilgileri güncelleme.
*   **Admin / Moderator Rolleri:** Adminlere özel kullanıcıları dondurma, silme ve moderatörlüğe yükseltme panelleri.

## 🛠️ Kullanılan Teknolojiler

*   **Frontend:** React, Context API, Socket.io-client, Axios, CSS (Inter font, özel gradient paleti)
*   **Backend:** Node.js, Express.js, Socket.io, Mongoose
*   **Veritabanı ve Önbellek:** MongoDB (Atlas), Redis (Performans ve oturum yönetimi için)
*   **Dosya Depolama:** Multer, Cloudinary (Görseller, avatarlar ve dosyalar için)

## 📦 Kurulum ve Çalıştırma

Local ortamınızda projeyi ayağa kaldırmak için aşağıdaki adımları izleyin.

### 1. Gereksinimler
*   Node.js (v16+)
*   MongoDB (Lokal veya Atlas URI)
*   Redis (İsteğe bağlı ancak önerilir — çalışmadığı senaryolarda önbelleğe alma baypas edilir)

### 2. Projeyi Klonlayın
```bash
git clone https://github.com/ferhatolmez/mernapp.git
cd mern-app
```

### 3. Ortam Değişkenleri
`backend` klasörü altında `.env` dosyası oluşturun ve aşağıdaki değerleri kendi altyapınıza göre doldurun:
```env
PORT=5000
NODE_ENV=development
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
REDIS_URL=redis://127.0.0.1:6379
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:3000
```
*Frontend tarafı için:* `frontend/.env` dosyasına (varsa) API URL adresini belirtin:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### 4. Bağımlılıkları Yükleyin ve Başlatın
**Backend için:**
```bash
cd backend
npm install
npm start
```
**Frontend için:**
```bash
cd frontend
npm install
npm start
```

Uygulamanız **http://localhost:3000** adresinde ayağa kalkacaktır. 🥳

---
*Geliştirme ve tasarımsal iyileştirmeler sürekli devam etmektedir.*
