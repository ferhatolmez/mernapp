# ⚡ MERN Full Stack Application v2.0

Kapsamlı, modern ve güvenli bir MERN (MongoDB, Express, React, Node.js) full-stack uygulaması.

---

## 🚀 Özellikler

### 🎨 Tasarım & UI
- **Dark/Light tema toggle** — Kullanıcı tercihi localStorage'da saklanır
- **Toast bildirimleri** — react-hot-toast ile modern bildirimler
- **Loading skeleton** — Veri yüklenirken iskelet ekranlar
- **Framer Motion animasyonları** — Sayfa geçişlerinde akıcı animasyonlar
- **Responsive sidebar** — Mobilde hamburger menü
- **Avatar upload** — Profil fotoğrafı yükleme

### ⚙️ Kullanışlılık
- **Email doğrulama** — Kayıtta email onay linki (Nodemailer + Ethereal dev)
- **Şifremi unuttum** — Email ile şifre sıfırlama
- **Bildirim sistemi** — In-app gerçek zamanlı bildirimler (Socket.io + API)
- **Arama geçmişi** — Son 20 arama kaydedilir
- **Çoklu chat odası** — general, random, tech + özel odalar
- **Mesaj silme/düzenleme** — Chat mesajlarını yönet (soft delete)
- **Dosya paylaşımı** — Chat'te resim ve dosya gönder (10MB'a kadar)
- **2FA (İki Faktörlü Doğrulama)** — Google Authenticator desteği

### 🛠️ Teknik
- **Unit testler** — Jest + Supertest (backend)
- **API rate limit göstergesi** — Frontend'de kalan istek sayısı
- **Swagger API doku.** — `/api-docs` adresinden erişilebilir
- **Redis cache** — Opsiyonel, ioredis ile cache middleware
- **Docker** — docker-compose ile tam ortam (MongoDB + Redis + Backend + Frontend)
- **CI/CD** — GitHub Actions workflow (test + build + Docker)
- **Winston logging** — Gelişmiş loglama (dosya + konsol)
- **TypeScript** — Kademeli geçiş (tsconfig + tip tanımları, yeni dosyalar TS'de)

---

## 🏗️ Proje Yapısı

```
mern-app/
├── backend/
│   ├── config/         # DB, Redis, Swagger konfigürasyonları
│   ├── controllers/    # Auth, Chat, User, Notification controller'ları
│   ├── middleware/      # Auth, authorize, cache, errorHandler
│   ├── models/          # User, Message, Notification, Room, RefreshToken
│   ├── routes/          # API route tanımları (Swagger annotated)
│   ├── utils/           # Logger, emailService
│   ├── uploads/         # Avatar ve chat dosyaları
│   ├── types/           # TypeScript tip tanımları
│   ├── __tests__/       # Jest test dosyaları
│   ├── Dockerfile
│   └── server.js        # Ana sunucu dosyası
├── frontend/
│   ├── src/
│   │   ├── components/  # Navbar, Sidebar, NotificationBell, Skeleton, PrivateRoute, RateLimitIndicator
│   │   ├── context/     # AuthContext, ThemeContext, ToastContext, NotificationContext
│   │   ├── pages/       # Login, Register, Dashboard, Chat, Profile, Admin, ForgotPassword, ResetPassword
│   │   ├── utils/       # API (Axios + rate limit tracking)
│   │   └── App.jsx
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── .github/workflows/ci-cd.yml
└── README.md
```

---

## 🔧 Kurulum

### Gereksinimler
- Node.js 18+
- MongoDB (Atlas veya lokal)
- Redis (opsiyonel)

### 1. Repoyu klonla
```bash
git clone https://github.com/<username>/mern-app.git
cd mern-app
```

### 2. Backend kurulumu
```bash
cd backend
npm install
cp .env.example .env
# .env dosyasını düzenleyin (MongoDB URI, JWT secrets)
npm run dev
```

### 3. Frontend kurulumu
```bash
cd frontend
npm install
npm start
```

### 4. Docker ile çalıştırma (Opsiyonel)
```bash
# Kök dizinde:
docker-compose up -d
# Frontend: http://localhost
# Backend: http://localhost:5000
# API Docs: http://localhost:5000/api-docs
```

---

## 🔑 Ortam Değişkenleri

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `PORT` | Sunucu portu | `5000` |
| `NODE_ENV` | Ortam | `development` |
| `MONGODB_URI` | MongoDB bağlantı URI'si | — |
| `JWT_ACCESS_SECRET` | Access token secret | — |
| `JWT_REFRESH_SECRET` | Refresh token secret | — |
| `CLIENT_URL` | Frontend URL'si | `http://localhost:3000` |
| `EMAIL_HOST` | SMTP host | Ethereal (dev) |
| `EMAIL_PORT` | SMTP port | `587` |
| `EMAIL_USER` | SMTP kullanıcı | Ethereal (dev) |
| `EMAIL_PASS` | SMTP şifre | Ethereal (dev) |
| `REDIS_URL` | Redis URL | `redis://localhost:6379` |

---

## 📡 API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/register` | Yeni kullanıcı kaydı |
| POST | `/login` | Giriş (2FA destekli) |
| POST | `/verify-email` | Email doğrulama |
| POST | `/forgot-password` | Şifre sıfırlama maili |
| POST | `/reset-password` | Şifre sıfırla |
| POST | `/refresh` | Access token yenile |
| POST | `/logout` | Çıkış |
| GET | `/me` | Mevcut kullanıcı bilgileri |
| POST | `/2fa/setup` | 2FA kurulumu |
| POST | `/2fa/verify` | 2FA doğrulama |
| POST | `/2fa/disable` | 2FA devre dışı |

### Users (`/api/users`)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| PUT | `/profile` | Profil güncelle |
| PUT | `/change-password` | Şifre değiştir |
| PUT | `/avatar` | Avatar yükle |
| GET/POST/DELETE | `/search-history` | Arama geçmişi |
| GET | `/stats` | İstatistikler (Admin) |
| GET/PUT/DELETE | `/:id` | Kullanıcı CRUD (Admin) |

### Chat (`/api/chat`)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/rooms` | Odaları listele |
| POST | `/rooms` | Yeni oda (Admin/Mod) |
| GET | `/messages` | Mesaj geçmişi (cursor pagination) |
| PUT | `/messages/:id` | Mesaj düzenle |
| DELETE | `/messages/:id` | Mesaj sil |
| POST | `/upload` | Dosya yükle |

### Notifications (`/api/notifications`)
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/` | Bildirimleri getir |
| GET | `/unread-count` | Okunmamış sayısı |
| PUT | `/read-all` | Tümünü oku |
| PUT | `/:id/read` | Bildirimi oku |
| DELETE | `/:id` | Bildirim sil |

> 📖 Tüm API dokümantasyonu: `http://localhost:5000/api-docs`

---

## 🔒 Güvenlik

- JWT (Access + Refresh Token) ile kimlik doğrulama
- HttpOnly cookie ile refresh token
- bcryptjs ile şifre hashleme
- Helmet HTTP güvenlik başlıkları
- express-rate-limit ile API rate limiting
- express-mongo-sanitize ile NoSQL injection koruması
- xss-clean ile XSS koruması
- CORS yapılandırması
- İki faktörlü doğrulama (2FA)
- Email doğrulama
- Rol tabanlı erişim kontrolü (RBAC)

---

## 🧪 Testler

```bash
# Backend testleri
cd backend
npm test
```

---

## 🐳 Docker

```bash
docker-compose up -d    # Başlat
docker-compose down     # Durdur
docker-compose logs -f  # Loglar
```

---

## 📝 Lisans

MIT License

---

**⚡ MERN App v2.0** — Geliştirici dostu, güvenli, modern full-stack uygulama.
