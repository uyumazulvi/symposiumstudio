# 🎙️ Symposium Studio — Canlı Konferans & Simultane Çeviri Konsolu

Uluslararası konferanslar, akademik sempozyumlar, paneller ve çok dilli oturumlar için tasarlanmış; **Bas-Konuş (PTT)**, **Sürekli Akış**, **Çok Dilli Konuşmacı Ataması** ve **Dinamik Ana Dil Çevirisi** özelliklerine sahip profesyonel yayın konsolu.

🌐 **Canlı Uygulama:** [https://symposiumstudio.vercel.app](https://symposiumstudio.vercel.app)

---

## 🌟 Temel Özellikler

### 1. 🌍 Dinleyici Ana Dili & Çok Dilli Konuşmacı Matrisi
* **Dinleyici Ana Dili (Header):** Üst bardaki `🌐 Ana Dil` seçiciden dinlemek istediğiniz dili (Türkçe, İngilizce, Almanca, Fransızca, İspanyolca, İtalyanca, Rusça, Arapça, Çince, Japonca) belirleyin.
* **Bağımsız Konuşmacı Dilleri:** Alt paneldeki her konuşmacıya farklı diller atanabilir:
  - *Konuşmacı 1 (İngilizce)* ➔ Dinleyici Ana Diline çevrilir (`EN ➔ TR`)
  - *Konuşmacı 2 (Almanca)* ➔ Dinleyici Ana Diline çevrilir (`DE ➔ TR`)
  - *Konuşmacı 3 (Türkçe)* ➔ Dinleyici diliyle aynıysa çevrilmeden orijinali gösterilir (`TR Orijinal`)
* Konuşmacı değiştikçe sahne altyazı motoru ve dil köprüsü anında yeni rotaya adapte olur.

### 2. ⚡ 0-Gecikmeli Donanım Soundboard Padleri
* Alt konsolda her konuşmacı için özel renk tonlamalı, tipografik ve duyarlı donanım butonları yer alır.
* Her pad üzerinde konuşmacının adı, lehçesi ve anlık çeviri rotası (`EN ➔ TR`, `DE ➔ TR`) görüntülenir.
* **Masaüstü Klavye Kısayolları:** `1`, `2`, `3` ... `9` rakam tuşlarına basarak konuşmacılar arasında fareye dokunmadan anında geçiş yapabilirsiniz.

### 3. 📱 Mobil Uyumlu Açılır Kapanır Çekmece Paneli (Expandable Drawer)
* Mobilde çoklu konuşmacı eklendiğinde alt panel ekranı tıkamaz; kompakt `[ ⌃ Panel ]` tutamacıyla yukarı doğru açılan 2 kolonlu bir kontrol merkezine dönüşür.
* Tek elle kullanım ve hızlı panel geçişleri için swipe down (aşağı kaydırma) ve dışarı dokunma ile kapanma özelliklerine sahiptir.

### 4. 🎛️ İki Farklı Çalışma Modu
* 📻 **Bas-Konuş (Push-to-Talk / Telsiz Modu):**  
  Konuşmacı konuşurken ilgili tuşa basılı tutun; bırakıldığı an konuşma sonlanır ve saniyeler içinde tutanağa kaydedilir.
* 🌊 **Sürekli Akış Modu:**  
  Konuşmacı butonuna tek dokunuşla mikrofonu o konuşmacıya aktarın. Yeni konuşmacı söze girdiğinde ona dokunmanız yeterlidir; sistem önceki cümleyi güvenle arşivleyip yeni konuşmacıya kesintisiz bağlanır.

### 5. 🟢 Stüdyo Tipi Donanım LED VU Metresi
* Web Audio API analizörü ile mikrofon giriş seviyesini izleyen, ses geldikçe anlık yanan **8 segmentli analog tarzı LED gösterge**.

### 6. 📺 Kristal Netliğinde Teleprompter Altyazı Sahnesi
* Orijinal konuşma akışı referans olarak üstte; yüksek kontrastlı, akıcı ve büyük simultane çeviri altyazısı sahnede odak noktasında görüntülenir.
* Compact, Standart ve Sinema font boyut seçenekleri mevcuttur.

### 7. 🤖 Çift Çeviri Motoru Pipeline'ı
1. **Google Gemini 1.5 Flash (Opsiyonel):** Ayarlardan ücretsiz Gemini API anahtarı girildiğinde akademik, tıp ve teknik terminolojiye tam uyumlu editoryal çeviri motoru devreye girer.
2. **Akıllı Web Çevirisi & MyMemory Fallback:** API anahtarı olmasa dahi kesintisiz çalışan yüksek hızlı web çeviri ağı.

### 8. 📝 Canlı Oturum Tutanağı & Dışa Aktarma
* Tüm konuşmalar konuşmacı adı, dili, zaman damgası ve çift dilli/yalnızca çeviri filtreleriyle kronolojik olarak kaydedilir.
* Tek tıkla panoya kopyalama veya `.txt` formatında resmi tutanak dökümü indirme.

---

## 🚀 Kurulum ve Çalıştırma

> [!IMPORTANT]
> Modern tarayıcılarda (Chrome, Edge) **Web Speech API** mikrofon izinlerinin her seferinde tekrar sorulmaması ve kesintisiz çalışması için projenin **HTTPS** veya **localhost** üzerinden çalıştırılması gerekmektedir (`file:///` protokolü doğrudan mikrofon izinlerini kısıtlayabilir).

### Yöntem 1: Canlı Web Yayını (Tavsiye Edilen)
Doğrudan [https://symposiumstudio.vercel.app](https://symposiumstudio.vercel.app) adresine giderek hemen kullanmaya başlayabilirsiniz. İsterseniz tarayıcıdan "Uygulamayı Yükle" diyerek masaüstü PWA olarak da kurabilirsiniz.

### Yöntem 2: Yerel Sunucu (Localhost)
Proje dizininde yerel sunucuyu başlatmak için:

```bash
# Python ile:
python -m http.server 3000

# veya Node.js ile:
npx serve . -l 3000
```
Tarayıcınızda `http://localhost:3000` adresini açın. Windows kullanıyorsanız dizindeki `start.bat` dosyasına çift tıklayarak da sunucuyu doğrudan başlatabilirsiniz.

---

## ⌨️ Klavye Kısayolları

| Tuş | Eylem |
| :--- | :--- |
| `1` - `9` | İlgili sıradaki konuşmacıyı anında aktif eder |
| `ESC` | Açık olan modalları ve mobil çekmeceyi kapatır |

---

## 🛠️ Teknolojiler
* **HTML5 / CSS3 (Modern Broadcast & Dark Glassmorphism Studio)**
* **Web Speech API (SpeechRecognition)**
* **Web Audio API (AudioContext & AnalyserNode VU Metre)**
* **Google Gemini API (Opsiyonel LLM Entegrasyonu)**
* **PWA (Progressive Web App - Web App Manifest & Standalone Display)**
