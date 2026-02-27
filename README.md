# ⚡ MERN Full Stack Application

Kapsamlı bir MERN (MongoDB, Express, React, Node.js) uygulaması.

## 🚀 Özellikler

### Backend
- ✅ JWT Access Token (15dk) + Refresh Token (7 gün) Authentication
- ✅ bcrypt ile şifre hashleme (salt rounds: 12)
- ✅ Role-Based Access Control (RBAC): user, moderator, admin
- ✅ Global error handler middleware
- ✅ Rate limiting (15dk/100 istek, login için 15dk/10 istek)
- ✅ Helmet (HTTP güvenlik başlıkları)
- ✅ CORS konfigürasyonu
- ✅ NoSQL injection koruması (express-mongo-sanitize)
- ✅ Socket.io ile gerçek zamanlı chat
- ✅ Cursor-based pagination (chat) + Offset-based pagination (admin)
- ✅ MongoDB aggregation pipeline (istatistikler)
- ✅ Mongoose index'leri

### Frontend
- ✅ React 18 + Hooks (useState, useEffect, useContext, useMemo, useCallback, useRef, useReducer)
- ✅ Context API ile global auth state yönetimi
- ✅ Axios interceptors (otomatik token yenileme)
- ✅ Protected Routes + Role-based Routes
- ✅ Gerçek zamanlı chat (Socket.io)
- ✅ Admin paneli (kullanıcı yönetimi, rol değiştirme, silme)
- ✅ Pagination bileşeni
- ✅ Şifre güçlük göstergesi
- ✅ Yazıyor bildirimi
- ✅ Online kullanıcı listesi

---

## 📁 Proje Yapısı

```
mern-app/
├── backend/
│   ├── config/
│   │   └── db.js              # MongoDB bağlantısı
│   ├── controllers/
│   │   ├── authController.js  # Register, Login, Refresh, Logout
│   │   ├── userController.js  # CRUD + Pagination + Stats
│   │   └── chatController.js  # Mesaj geçmişi
│   ├── middleware/
│   │   ├── auth.js            # JWT doğrulama
│   │   ├── authorize.js       # Rol kontrolü
│   │   └── errorHandler.js    # Global hata yönetimi
│   ├── models/
│   │   ├── User.js            # Kullanıcı şeması
│   │   ├── RefreshToken.js    # Refresh token şeması
│   │   └── Message.js         # Chat mesaj şeması
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   └── chat.js
│   ├── server.js              # Ana sunucu + Socket.io
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── context/
    │   │   └── AuthContext.jsx    # Global auth state (useReducer)
    │   ├── hooks/
    │   │   └── usePagination.js   # Custom pagination hook
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── Pagination.jsx     # Pagination bileşeni
    │   │   └── PrivateRoute.jsx   # Korumalı route'lar
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx      # Ana sayfa
    │   │   ├── Chat.jsx           # Gerçek zamanlı chat
    │   │   ├── AdminPanel.jsx     # Kullanıcı yönetimi
    │   │   └── Profile.jsx        # Profil + şifre değiştir
    │   ├── utils/
    │   │   └── api.js             # Axios instance + interceptors
    │   ├── App.jsx                # Router yapısı
    │   ├── index.js
    │   └── styles.css
    └── package.json
```

---

## ⚙️ Kurulum

### 1. Gereksinimler
- Node.js v18+
- MongoDB (local veya Atlas)

### 2. Backend Kurulumu

```bash
cd backend

# Paketleri kur
npm install

# .env dosyasını oluştur
cp .env.example .env
# .env dosyasını düzenleyip kendi değerlerinizi girin

# Geliştirme modunda başlat
npm run dev

# Production'da başlat
npm start
```

### 3. Frontend Kurulumu

```bash
cd frontend

# Paketleri kur
npm install

# Geliştirme modunda başlat
npm start
```

### 4. .env Dosyası (backend/.env)

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/mernapp
JWT_ACCESS_SECRET=gizli_access_key_buraya
JWT_REFRESH_SECRET=gizli_refresh_key_buraya
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CLIENT_URL=http://localhost:3000
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| POST | /api/auth/register | Kayıt | ❌ |
| POST | /api/auth/login | Giriş | ❌ |
| POST | /api/auth/refresh | Token yenile | Cookie |
| POST | /api/auth/logout | Çıkış | ❌ |
| GET | /api/auth/me | Mevcut kullanıcı | ✅ |

### Users
| Method | Endpoint | Açıklama | Auth | Rol |
|--------|----------|----------|------|-----|
| GET | /api/users | Kullanıcı listesi | ✅ | admin/mod |
| GET | /api/users/stats | İstatistikler | ✅ | admin |
| GET | /api/users/:id | Tekil kullanıcı | ✅ | admin/mod |
| PUT | /api/users/profile | Profil güncelle | ✅ | herkes |
| PUT | /api/users/change-password | Şifre değiştir | ✅ | herkes |
| PUT | /api/users/:id | Kullanıcı güncelle | ✅ | admin |
| DELETE | /api/users/:id | Kullanıcı sil | ✅ | admin |

### Chat
| Method | Endpoint | Açıklama | Auth |
|--------|----------|----------|------|
| GET | /api/chat/messages | Mesaj geçmişi | ✅ |

### Socket.io Events
| Event | Yön | Açıklama |
|-------|-----|----------|
| joinRoom | Client→Server | Odaya katıl |
| sendMessage | Client→Server | Mesaj gönder |
| typing | Client→Server | Yazıyor bildirimi |
| newMessage | Server→Client | Yeni mesaj |
| onlineUsers | Server→Client | Online liste |
| userTyping | Server→Client | Kim yazıyor |

---

## 🔐 Güvenlik Özellikleri

1. **bcrypt** — Şifreler salt=12 ile hashlenmiş
2. **JWT** — Access (15dk) + Refresh (7 gün, HttpOnly cookie)
3. **Helmet** — HTTP güvenlik başlıkları
4. **Rate Limiting** — API ve auth limiteri
5. **CORS** — Sadece izin verilen origin
6. **NoSQL Injection** — express-mongo-sanitize
7. **Input Validation** — Mongoose validators
8. **HttpOnly Cookie** — XSS koruması için refresh token

---

## 🌐 Production Deploy

### Backend (Railway/Render/VPS)
```bash
npm start
# PM2 ile: pm2 start server.js --name mern-backend
```

### Frontend (Vercel/Netlify)
```bash
npm run build
# build/ klasörünü deploy et
```

### Environment Variables (Production)
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://...Atlas URI...
JWT_ACCESS_SECRET=<en az 64 karakterlik random string>
JWT_REFRESH_SECRET=<en az 64 karakterlik random string>
CLIENT_URL=https://your-frontend.vercel.app
```
