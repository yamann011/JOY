# 🎮 JOY Platform

Modern ve çok fonksiyonlu sosyal platform. Etkinlik yönetimi, canlı sohbet, destek sistemi, gömmeli içerikler ve daha fazlası!

## ✨ Özellikler

### 🎯 Ana Özellikler
- 🔐 **Kullanıcı Yönetimi**: Güvenli kayıt/giriş sistemi
- 👥 **Roller**: Admin, Moderatör, VIP, Kullanıcı
- 🎊 **Etkinlik Sistemi**: PK & Etkinlik yönetimi
- 💬 **Canlı Sohbet**: Grup sohbetleri, floating chat widget
- 🎮 **Oyunlar & İçerikler**: Gömmeli siteler (oyunlar, filmler, analiz vb.)
- 🎫 **Destek Sistemi**: Ticket bazlı destek talebi
- 🎬 **Film Sayfası**: Film izleme platformu
- 👑 **VIP Uygulamalar**: VIP kullanıcılar için özel uygulamalar
- 📢 **Duyuru Sistemi**: Global duyurular
- 🎨 **Banner Yönetimi**: Ana sayfa banner carousel
- 🎵 **Arka Plan Müziği**: YouTube entegrasyonu

### 🛠️ Teknik Özellikler
- ⚡ **Modern Stack**: React 18 + TypeScript + Vite
- 🎨 **UI Framework**: Tailwind CSS + Radix UI + shadcn/ui
- 🔄 **State Management**: TanStack Query (React Query)
- 🗄️ **Veritabanı**: PostgreSQL + Drizzle ORM
- 🚀 **Backend**: Express.js + TypeScript
- 🔒 **Güvenlik**: Session-based authentication
- 📱 **Responsive**: Tüm cihazlarda uyumlu

## 📋 Gereksinimler

- Node.js 18+ veya üzeri
- PostgreSQL 14+ veritabanı
- npm veya yarn paket yöneticisi

## 🚀 Kurulum

### 1. Projeyi Klonlayın
```bash
git clone <repository-url>
cd joy-main
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Ortam Değişkenlerini Ayarlayın
Proje kök dizininde `.env` dosyası oluşturun:

```env
# Veritabanı
DATABASE_URL=postgresql://kullanici:sifre@localhost:5432/veritabani_adi

# Session
SESSION_SECRET=cok_guclu_rastgele_sifre_buraya_yaz

# Ortam
NODE_ENV=development
PORT=5000
```

### 4. Veritabanını Hazırlayın
```bash
# Veritabanı şemasını oluştur
npm run db:push

# Veya migration ile
npm run db:generate
npm run db:migrate
```

### 5. Uygulamayı Başlatın

**Geliştirme Modu:**
```bash
npm run dev
```

**Production Modu:**
```bash
npm run build
npm start
```

Uygulama `http://localhost:5000` adresinde çalışacaktır.

## 📁 Proje Yapısı

```
joy-main/
├── client/                  # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # UI bileşenleri
│   │   ├── pages/          # Sayfa bileşenleri
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Yardımcı fonksiyonlar
│   │   └── App.tsx         # Ana uygulama
│   └── index.html
├── server/                  # Backend (Express + TypeScript)
│   ├── routes.ts           # API endpoint'leri
│   ├── storage.ts          # Veritabanı işlemleri
│   ├── db.ts               # Veritabanı bağlantısı
│   └── index.ts            # Server başlangıç
├── shared/                  # Paylaşılan tipler ve şemalar
│   └── schema.ts           # Drizzle ORM şemaları
├── script/                  # Build scriptleri
└── package.json
```

## 🎮 Kullanım

### İlk Giriş
1. Uygulamayı başlatın
2. Kayıt olun (ilk kullanıcı otomatik ADMIN olur)
3. Admin paneline gidin
4. Sistemi özelleştirmeye başlayın!

### Admin Paneli
- `/admin` - Admin kontrol paneli
- Kullanıcı yönetimi
- Duyuru yönetimi
- Banner yönetimi
- Gömmeli site yönetimi
- VIP uygulama yönetimi

### Moderatör Paneli
- `/management` - Moderatör paneli
- Kullanıcı listeleme
- Ticket yönetimi

## 🌐 Deployment

### VPS/Cloud Sunucu (Ubuntu)

```bash
# Node.js yükle
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL yükle
sudo apt install postgresql postgresql-contrib

# PM2 ile çalıştır
npm install -g pm2
npm run build
pm2 start npm --name "joy-app" -- start
pm2 save
pm2 startup
```

### Docker

```bash
# Docker ile çalıştır
docker-compose up -d

# Veritabanını hazırla
docker-compose exec app npm run db:push
```

### Heroku

```bash
heroku create joy-platform
heroku addons:create heroku-postgresql:mini
heroku config:set SESSION_SECRET=guclu_sifre
git push heroku main
heroku run npm run db:push
```

## 🔧 Özelleştirme

### Site Branding
Admin panelinden:
- Site adını değiştirin
- Logo ve renkleri özelleştirin
- Banner'ları yönetin

### Gömmeli İçerikler
1. Admin Panel → Gömmeli Siteler
2. "Site Ekle" butonuna tıklayın
3. İsim, kategori, URL girin
4. Kaydedin

### VIP Uygulamalar
1. Admin Panel → VIP Uygulamalar
2. Uygulama ekleyin (isim, açıklama, download link)
3. Sadece VIP kullanıcılar görebilir

## 🐛 Sorun Giderme

### Veritabanı Bağlantı Hatası
```bash
# PostgreSQL'in çalıştığından emin olun
sudo systemctl status postgresql

# DATABASE_URL'i kontrol edin
echo $DATABASE_URL
```

### Port Hatası
```bash
# .env dosyasında farklı port deneyin
PORT=3000
```

### Build Hatası
```bash
# node_modules'u temizleyin
rm -rf node_modules package-lock.json
npm install
```

## 📝 Geliştirme

### Yeni Sayfa Eklemek
1. `client/src/pages/` altında yeni dosya oluşturun
2. `client/src/App.tsx`'e route ekleyin
3. Hamburger menüye link ekleyin (opsiyonel)

### Yeni API Endpoint Eklemek
1. `server/routes.ts`'e endpoint ekleyin
2. `server/storage.ts`'e veritabanı metodunu ekleyin
3. `shared/schema.ts`'e tip tanımı ekleyin

### Veritabanı Değişikliği
1. `shared/schema.ts`'i düzenleyin
2. `npm run db:push` çalıştırın

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing`)
3. Değişikliklerinizi commit edin (`git commit -m 'feat: amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 📧 İletişim

Sorularınız için issue açabilirsiniz.

---

⭐ Beğendiyseniz yıldız vermeyi unutmayın!
