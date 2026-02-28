<div align="center">
  <img src="https://img.icons8.com/color/120/000000/chat--v1.png" alt="Chat Application Logo">
  <h1>🚀 MERN Stack Real-Time Chat & Dashboard</h1>
  <p>
    <strong>Tam donanımlı, gerçek zamanlı ve modern arayüzlü bir Full Stack İletişim Platformu</strong>
  </p>

  [![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
  [![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
  [![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
  [![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
</div>

<br />

Bu proje, **MongoDB, Express.js, React ve Node.js (MERN)** teknolojileriyle inşa edilmiş, kapsamlı bir anlık mesajlaşma ve yönetim uygulamasıdır. Kullanıcılara WhatsApp veya Telegram benzeri akıcı bir deneyim sunarken, arka planda güvenliği ve hızı ön planda tutan mimariler barındırır.

---

## ✨ Öne Çıkan Özellikler

### 💬 Anlık Mesajlaşma (Real-Time Chat)
- **Kesintisiz İletişim:** Socket.io entegrasyonu sayesinde gecikmesiz (real-time) mesaj iletimi.
- **Odalar ve Özel Mesajlar:** Genel sohbet odalarına (Genel, Teknoloji vb.) katılabilme veya doğrudan birebir (Private) mesajlaşma.
- **Kapsamlı Mesaj İşlemleri:** Gönderilen mesajları tıpkı popüler uygulamalardaki gibi anında **Düzenleme (Edit)** ve **Silme (Delete)**.
- **Akıllı Yazıyor Bildirimi:** Karşı tarafın mesaj yazdığını gösteren dinamik "*Yazıyor...*" efekti.
- **Çoklu Medya Paylaşımı:** Mesajların yanında resim, doküman veya arşiv (zip/rar) dosyaları gönderebilme altyapısı (Cloudinary & Multer Entegrasyonu).

### 🎨 Modern ve Tam Responsive Arayüz
- **Pürüzsüz Deneyim:** Tamamen cihaz boyutlarına duyarlı "Mobile-First" yaklaşımı. Telefon ekranlarında kusursuz sayfa navigasyonu.
- **Premium Temalar:** Soft "Mor ve Turuncu" gradient paletleriyle harmanlanmış Göz Yormayan Karanlık Mod (Dark Mode) / Aydınlık Mod (Light Mode) seçenekleri.
- **Etkileşimli UI:** Hover animasyonları, skeleton (iskelet) yükleme ekranları ve gelişmiş "Toast" bildirimleriyle zengin bir deneyim.

### 🛡️ İleri Düzey Güvenlik (Security First)
- **JWT & Refresh Token:** Kullanıcıların hesaplarına erişimi en güvenli şekilde yönetmek için kısa ömürlü ve uzun ömürlü token yapıları.
- **İki Aşamalı Doğrulama (2FA):** Google Authenticator (veya Authy) üzerinden taranabilen QR Kod ile ek güvenlik katmanı.
- **Email Doğrulama & Şifre Yenileme:** Kayıt sonrası e-posta aktivasyonu ve şifresini unutan kullanıcılar için tek seferlik güvenli link (Nodemailer) gönderimi.
- **Gelişmiş Önlemler:** API istek sınırlaması (Rate Limiter), güvenlik başlıkları (Helmet) ve CORS koruması.

### 📊 Rol Tabanlı Yönetim (Admin Dashboard)
- Uygulama içerisindeki herkes yönetici değildir. `Admin` ve `Moderator` rolleri için özel yönetim panelleri mevcuttur.
- Yöneticiler uygulama içindeki kullanıcı sayısını, rollerini yönetebilir; gerektiğinde sorunlu hesapları engelleyebilir (ban) veya hesapları silebilir.

---

## 🛠️ Mimari & Teknoloji Yığını (Tech Stack)

### Frontend (Kullanıcı Arayüzü)
- React (Hooks Context API)
- Socket.io-Client (Canlı veri akışı)
- React-Router-Dom (SPA yönlendirmeleri)
- Axois (HTTP istekleri)
- Framer Motion (Akıcı animasyonlar)
- Vanilla CSS (Özel, yalın ve modern tasarım)

### Backend (Sunucu & API)
- Node.js & Express.js (RESTful API)
- MongoDB & Mongoose (NoSQL Veri Yönetimi)
- Socket.io (WebSocket Yönetimi)
- Redis (Yüksek performans için Caching & Session Store)
- JSON Web Token, Bcrypt.js (Kriptografi & Auth)
- Nodemailer (SMTP E-Posta entegrasyonu)
- Multer & Cloudinary (Dosya / Avatar yükleme bulut servisi)

---

## 🚀 Kurulum (Local Development)

Projeyi kendi bilgisayarınızda (localhost) çalıştırmak için aşağıdaki adımları sırasıyla uygulayın.

### 1️⃣ Ön Gereksinimler
Sisteminize aşağıdaki servislerin kurulu olduğundan emin olun:
- [Node.js](https://nodejs.org/) (v16 veya üzeri tavsiye edilir)
- [MongoDB](https://www.mongodb.com/) (Local veya Atlas bulut kümesi)
- [Redis](https://redis.io/) (Opsiyonel ama önerilir. Çalıştırmak için `redis-server` başlatılmalı veya `.env` üzerinden kapatılmalıdır.)

### 2️⃣ Repoyu Klonlama ve Kurulum
```bash
# Projeyi bilgisayarınıza klonlayın
git clone https://github.com/KULLANICI_ADINIZ/mernapp.git

# Proje dizinine girin
cd mernapp
```

Bağımlılıkların (Dependencies) yüklenmesi:
```bash
# Backend (Sunucu) klasöründeki paketleri yükleyin
cd backend
npm install

# İkinci bir terminal açarak Frontend klasöründeki paketleri yükleyin
cd ../frontend
npm install
```

### 3️⃣ Çevre Değişkenlerinin Ayarlanması (.env)

`backend/` dizininin içine `.env` adında bir dosya oluşturup aşağıdaki yapılandırma anahtarlarını kendi bilgilerinizle doldurun:

```env
# ⚙️ Temel Ayarlar
PORT=5000
NODE_ENV=development

# 🗄️ Veritabanı ve Önbellek
MONGO_URI=mongodb://127.0.0.1:27017/mernapp
REDIS_URL=redis://127.0.0.1:6379

# 🔐 Güvenlik Şifrelemeleri
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key

# 📧 Mail Hizmeti Ayarları (Gmail vb.)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# ☁️ Cloudinary (Medya Yükleme)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# 🌐 İzin Verilen Kaynaklar (CORS)
FRONTEND_URL=http://localhost:3000
```

*Not: Eğer Frontend'in API'yi bulmasını yapılandırmak istiyorsanız `frontend/` klasörü altına `frontend/.env` dosyası koyabilirsiniz:*
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

### 4️⃣ Uygulamayı Çalıştırma

Tüm ayarlar bittikten sonra iki farklı terminal sekmesinden projeyi başlatabilirsiniz.

```bash
# Terminal 1: Backend API ve Socket dinleyicisini Başlat
cd backend
npm start
# (Eğer nodemon yüklüyse dev komutunu çalıştırabilirsiniz: npm run dev)
```

```bash
# Terminal 2: React Arayüzünü Başlat
cd frontend
npm start
``` 

Uygulamanız varsayılan olarak **http://localhost:3000** adresinde hizmet vermeye başlayacaktır.

---

## 📂 Proje Dizin Yapısı
Projenin temel mimari dizini aşağıdakine benzer bir pattern kullanır:
```text
/
├── backend/                  # REST API ve Websocket İşlemleri
│   ├── config/               # DB ve Redis bağlantı konfigürasyonları
│   ├── controllers/          # İsteklerin işlendiği fonksiyonlar (Auth, Chat)
│   ├── middleware/           # Kimlik doğrulama, Hata yakalayıcı ve Yükleme ara katmanları
│   ├── models/               # Mongoose şemaları (User, Message, Room vb.)
│   ├── routes/               # API Yönlendiricileri (Endpoints)
│   ├── utils/                # E-posta gönderme, Cloudinary şablon yardımcıları
│   └── server.js             # Sunucunun başlatıldığı ana dosya
│
├── frontend/                 # Kullanıcı Etkileşim Yüzeyi
│   ├── src/
│   │   ├── components/       # Tekrar kullanılabilir, modüler arayüz bileşenleri
│   │   ├── context/          # State Yönetimi (AuthContext, ChatContext vb.)
│   │   ├── pages/            # Ana Modüller (Dashboard, Chat Mimarisi, Profil)
│   │   ├── utils/            # Axios API istek yardımcıları
│   │   ├── App.jsx           # Projenin Köklü Yönlendiricisi (Router)
│   │   └── styles.css        # Zenginleştirilmiş, temaya özel Vanilla Cascade yapısı
```

---

<div align="center">
  <p>Tasarımsal İyileştirmeler ve Geliştirmeler ile sürekli güncellenmektedir.</p>
</div>
