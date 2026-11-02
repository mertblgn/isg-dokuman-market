# İSG Doküman Marketi — görsel prototip

Bu klasör, İSG raporu ve şablonları için mağazanın ilk görsel sürümüdür. HTML/CSS/JavaScript kullanır; `index.html` dosyasını tarayıcıda açarak kataloğu, aramayı, kategorileri, filigranlı örnek önizleme penceresini ve demo sepetini inceleyebilirsin.

## Bu sürümde çalışanlar
- Mobil uyumlu mağaza arayüzü
- Örnek ürün kartları ve kategori filtreleri
- Arama ve fiyat sıralaması
- 3 adımlı, filigranlı temsili sayfa önizlemesi
- Sepete ekleme davranışının demo hali
- `admin.html` üzerinde ürün ekleme arayüzü prototipi

## Henüz çalışmayanlar
- Gerçek kullanıcı girişi
- Yönetici yetkilendirmesi
- Supabase'e ürün kaydı veya dosya yükleme
- iyzico ödeme
- Gerçek sipariş ve indirme bağlantısı
- Satın alınan dosyaların korunması

Admin demo ekranındaki ürün ve dosya seçimleri kalıcı değildir. Gerçek ürün dosyalarını HTML içine koyma veya herkese açık klasörde tutma.

## Dosya yapısı
```text
isg-dokuman-magazasi/
  index.html
  admin.html
  assets/
    style.css
    app.js
  supabase/
    schema.sql
```

## 1. Bilgisayarında aç
1. ZIP dosyasını bir klasöre çıkar.
2. `index.html` dosyasına çift tıkla.
3. Ürün önizleme ve filtreleri test et.
4. Yönetim arayüzünü `admin.html` üzerinden aç.

Geliştirme sırasında VS Code ve Live Server kullanabilirsin.

## 2. Supabase projesi oluştur
1. Supabase üzerinde yeni proje oluştur.
2. SQL Editor > New query bölümüne gir.
3. `supabase/schema.sql` içeriğini çalıştır.
4. Storage bölümünde `product-files` bucket'ının private kaldığını kontrol et.
5. `product-previews` bucket'ına yalnızca filigranlı önizleme görselleri yükle.

Bu SQL başlangıç şemasıdır; canlıya almadan önce admin rolü ve Storage politikaları tamamlanmalıdır. RLS açık tutulmalıdır. `service_role` anahtarını asla tarayıcıya koyma.

## 3. Gerçek ürün yükleme ve yönetici paneli
Sonraki geliştirme adımında Supabase Auth ile yönetici girişi, sadece admin rolüne izin veren sunucu tarafı kontrol, ürün kaydı ve dosya yükleme eklenmeli. Kullanıcıların admin olup olmadığını yalnızca `localStorage`, gizli URL veya ön yüz değişkeniyle belirlemek güvenli değildir.

Ürün tablosunda:
- `title`, `slug`, `description`, `format`, `price_kurus`
- `category_id`, `version_label`, `is_published`
- `storage_path`, `file_name`
- `preview_pages` (filigranlı görsel URL/yollarını içeren JSON dizi)

alanları kullanılır. Fiyatı kuruş cinsinden sakla; örneğin 149 TL = 14900.

## 4. Filigranlı önizleme
Orijinal DOCX/XLSX/PDF dosyasını doğrudan tarayıcıya açmak yerine, dosyanın birkaç sayfasından ayrı önizleme görselleri üret. Görsellerin üstüne büyük, yarı saydam “ÖNİZLEME” filigranı ekle. Ürün dosyası özel `product-files` bucket'ında, önizleme görselleri ise `product-previews` bucket'ında saklanır. Tam belgeyi önizleme olarak yükleme.

Bu prototipteki önizleme görselleri yalnızca temsili HTML çizimidir; gerçek dosyalarından üretilmiş değildir.

## 5. iyzico entegrasyonu — sonraki aşama
Ödeme akışı şu şekilde kurulmalı:
1. Oturum açmış kullanıcı checkout isteği gönderir.
2. Sunucu, ürün fiyatını Supabase'den tekrar okur; istemciden gelen fiyatı doğru kabul etmez.
3. Sunucu pending sipariş oluşturur ve iyzico ödeme başlatma API'sini çağırır.
4. iyzico dönüşü/webhook bildirimi sunucuda doğrulanır.
5. Yalnızca doğrulanmış başarılı ödeme siparişi `paid` yapar.
6. İndirme endpoint'i kullanıcının sipariş sahipliğini ve `paid` durumunu kontrol eder.
7. Sunucu private Storage dosyası için kısa ömürlü signed URL üretir ve indirme olayını kaydeder.

API anahtarları Supabase Edge Function secrets ortamında tutulmalıdır. Başarılı yönlendirme sayfasına dönmek tek başına ödeme kanıtı değildir. iyzico'nun güncel entegrasyon dokümanına göre checkout ve bildirim doğrulama adımlarını uygula.

## 6. Yayınlama
Ön yüz için Netlify, Vercel veya benzeri statik hosting kullanılabilir. Ancak yalnızca statik hosting, güvenli ödeme ve dosya yetkilendirmesini sağlamaz; Supabase Edge Functions gibi sunucu tarafı bileşenler gerekir.

## 7. Canlıya çıkmadan önce kontrol listesi
- [ ] Gerçek yönetici girişi ve admin yetkisi
- [ ] Supabase RLS ve Storage politikalarının test edilmesi
- [ ] iyzico test ortamı ile ödeme/doğrulama testleri
- [ ] Başarısız ödeme, tekrar bildirim ve iade senaryoları
- [ ] Dosya boyutu ve uzantı doğrulaması
- [ ] Filigranlı önizlemelerin kontrolü
- [ ] KVKK, gizlilik, mesafeli satış, ön bilgilendirme ve dijital içerik süreçlerinin hukuken kontrolü
- [ ] Yedekleme ve hata kayıtları

## Önemli
Bu prototip gerçek satışa hazır değildir. Gerçek müşteri verisi, ödeme bilgisi veya ürün dosyasıyla kullanmadan önce backend ve güvenlik adımları tamamlanmalıdır.


## Yeni prototip sürümü
- Logo kırmızı baret + A4 sayfa simgesi olarak yenilendi.
- Siyah/sarı/kırmızı tema eklendi.
- `admin.html` üzerinden dosya seçme (herhangi bir uzantı), fiyat belirleme, mevcut ürünün liste/satış fiyatını değiştirme ve otomatik indirim yüzdesi hesaplama çalışır.
- Ürün bilgileri `localStorage`, seçilen dosya `IndexedDB` içinde bu tarayıcıya yerel olarak kaydedilir. `index.html` aynı tarayıcıda açıldığında ürün kataloğu güncellenir.
- Bu hâlâ yerel prototiptir: başka ziyaretçiler ürünleri göremez, yönetici girişi yoktur, ödeme ve güvenli indirme yoktur. Gerçek yayına geçiş için Supabase Auth/Storage/RLS ve sunucu tarafı ödeme doğrulaması gerekir.
