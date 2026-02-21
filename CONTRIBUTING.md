# 🤝 Contributing to JOY Platform

Katkıda bulunmak istediğiniz için teşekkürler! Bu rehber size nasıl katkıda bulunabileceğinizi gösterecektir.

## 🚀 Başlamadan Önce

1. Projeyi fork edin
2. Local ortamınıza klonlayın
3. Yeni bir branch oluşturun

```bash
git checkout -b feature/amazing-feature
```

## 📝 Geliştirme Süreci

### 1. Kod Standartları
- TypeScript kullanın
- ESLint kurallarına uyun
- Anlamlı değişken isimleri kullanın
- Türkçe arayüz metinleri için tutarlı olun

### 2. Commit Mesajları
Conventional Commits standardını kullanın:

```
feat: yeni özellik ekle
fix: bug düzelt
docs: dokümantasyon güncelle
style: kod formatı değişikliği
refactor: kod yeniden yapılandırma
test: test ekle/güncelle
chore: proje yapılandırması
```

Örnek:
```bash
git commit -m "feat: gömmeli site silme özelliği ekle"
git commit -m "fix: ticket durum güncellemesi hatası düzelt"
```

### 3. Pull Request Süreci

1. Değişikliklerinizi commit edin
2. Branch'inizi push edin
3. Pull Request açın
4. Açıklama ekleyin:
   - Ne değişti?
   - Neden değişti?
   - Nasıl test edildi?

### 4. Kod İncelemesi
- En az 1 onay gereklidir
- CI/CD testlerinin geçmesi gerekir
- Kod standartlarına uygun olmalıdır

## 🐛 Bug Raporu

Bug bulduğunuzda:

1. Issue açın
2. Detaylı açıklama yapın:
   - Ne olması gerekiyordu?
   - Ne oldu?
   - Nasıl tekrarlanabilir?
   - Ekran görüntüsü (varsa)

## 💡 Özellik Önerisi

Yeni özellik önerisi için:

1. Issue açın
2. "Feature Request" etiketini kullanın
3. Detaylı açıklama:
   - Hangi problemi çözüyor?
   - Nasıl çalışmalı?
   - Alternatifler var mı?

## 📁 Proje Yapısı Kuralları

### Frontend (client/src/)
```
components/     # Yeniden kullanılabilir UI bileşenleri
pages/          # Sayfa bileşenleri
hooks/          # Custom React hooks
lib/            # Yardımcı fonksiyonlar
```

### Backend (server/)
```
routes.ts       # API endpoint'leri
storage.ts      # Veritabanı işlemleri
db.ts           # Veritabanı bağlantısı
```

### Shared (shared/)
```
schema.ts       # Veritabanı şemaları ve tipler
```

## 🎨 UI/UX Kuralları

- Responsive tasarım (mobile-first)
- Tailwind CSS kullanın
- shadcn/ui bileşenlerini tercih edin
- Dark mode desteği
- Türkçe metin kullanın

## 🧪 Test

```bash
# Tip kontrolü
npm run check

# Build testi
npm run build

# Çalıştırma testi
npm run dev
```

## 📦 Yeni Bağımlılık Eklemek

1. Gerekli olup olmadığını kontrol edin
2. Alternatif çözümler araştırın
3. Ekleme sebebini açıklayın
4. `package.json`'a ekleyin
5. `README.md`'de belirtin

## 🔒 Güvenlik

Güvenlik açığı bulursanız:

1. **Public issue açmayın**
2. Özel olarak bildirin
3. Detayları paylaşın
4. Düzeltme bekleyin

## 📚 Dokümantasyon

Kod değişikliği yaparsanız:

1. İlgili dokümantasyonu güncelleyin
2. Yorum satırları ekleyin
3. README.md'yi güncelleyin
4. Örnekler ekleyin

## ✅ Checklist

PR göndermeden önce:

- [ ] Kod çalışıyor mu?
- [ ] Testler geçiyor mu?
- [ ] Dokümantasyon güncellendi mi?
- [ ] Commit mesajları uygun mu?
- [ ] Konflikt yok mu?

## 🙏 Teşekkürler

Katkılarınız için şimdiden teşekkür ederiz! Birlikte harika bir platform oluşturacağız! 🚀

## 📞 İletişim

Sorularınız için:
- Issue açın
- Discussion başlatın

---

Mutlu kodlamalar! ❤️
