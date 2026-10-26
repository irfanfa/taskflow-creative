# Panduan Aplikasi Mobile KMB Team Creative (Android & iOS)

Aplikasi **KMB Team Creative** kini telah dilengkapi dengan integrasi native **Capacitor JS**, memungkinkan Anda menjalankan dan mengekspor aplikasi ke **Android (.apk / .aab)** dan **iOS (Xcode / .ipa)** dengan satu basis kode terpadu.

---

## 📁 Struktur Direktori Mobile

```
taskflow-creative/
├── android/                 # Proyek native Android (siap dibuka di Android Studio)
│   ├── app/
│   │   ├── src/main/res/   # Ikon resmi & splash screen KMB Team Creative
│   │   └── AndroidManifest.xml # Izin kamera, internet, media upload
│   └── gradlew.bat
├── ios/                     # Proyek native iOS (siap dibuka di Xcode macOS)
│   └── App/
│       └── App.xcworkspace
├── capacitor.config.ts      # Konfigurasi utama Capacitor
└── MOBILE_GUIDE.md          # Panduan ini
```

---

## 🚀 1. Persiapan & Mode Pengujian

### A. Menjalankan di HP Android Fisik saat Development (Live Reload)

1. Pastikan laptop dan HP Android terhubung ke **jaringan Wi-Fi yang sama**.
2. Cari alamat IP laptop Anda (buka PowerShell/CMD dan ketik `ipconfig`, contoh: `192.168.1.15`).
3. Buka file [`capacitor.config.ts`](./capacitor.config.ts) dan aktifkan baris `server.url`:
   ```ts
   server: {
     androidScheme: 'https',
     cleartext: true,
     url: 'http://192.168.1.15:3000', // Ganti dengan IP laptop Anda
   },
   ```
4. Jalankan perintah sinkronisasi:
   ```bash
   npm run cap:sync
   ```
5. Buka server Next.js di laptop:
   ```bash
   npm run dev -- -H 0.0.0.0
   ```

---

## 📱 2. Membuka & Mem-build APK di Android Studio (Windows)

1. Download dan pasang **[Android Studio](https://developer.android.com/studio)** jika belum terpasang.
2. Buka proyek Android dengan perintah:
   ```bash
   npm run cap:android
   ```
   *(Atau buka Android Studio -> File -> Open -> pilih folder `taskflow-creative/android`)*.
3. Tunggu hingga Gradle selesai mengunduh dependensi (proses pertama kali memerlukan beberapa menit).
4. **Untuk Menjalankan ke HP / Emulator**:
   - Aktifkan *USB Debugging* di HP Android Anda, hubungkan kabel data USB ke laptop.
   - Klik tombol **Run (Segitiga Hijau ▶)** di bagian atas Android Studio.
5. **Untuk Membuat File APK Siap Install**:
   - Di Android Studio, klik menu: **Build -> Build Bundle(s) / APK(s) -> Build APK(s)**.
   - Setelah selesai, klik notifikasi **"locate"** untuk mengambil file `app-debug.apk`.
   - File APK tersebut bisa langsung Anda kirimkan ke tim via WhatsApp/Telegram untuk langsung di-install di HP Android.

---

## 🍎 3. Membuka di iOS (macOS / Xcode)

1. Salin repositori ke perangkat Mac.
2. Buka proyek iOS dengan perintah:
   ```bash
   npm run cap:ios
   ```
   *(Atau buka file `ios/App/App.xcworkspace` langsung di Xcode)*.
3. Di Xcode, pilih perangkat simulator atau iPhone fisik Anda.
4. Klik tombol **Play / Run ▶** untuk menjalankan aplikasi.
5. Untuk distribusi TestFlight / App Store, pilih menu **Product -> Archive**.

---

## 🛠 Perintah Penting (NPM Scripts)

| Perintah | Fungsi |
|---|---|
| `npm run cap:sync` | Menyinkronkan perubahan web assets & konfigurasi ke folder Android & iOS |
| `npm run cap:android` | Membuka proyek Android Studio |
| `npm run cap:ios` | Membuka proyek Xcode (di macOS) |
| `npm run build` | Melakukan build aplikasi web Next.js |

---

## ✨ Fitur Native yang Sudah Aktif
- **Ikon Aplikasi Resmi**: Ikon RRI KMB Team Creative sudah terpasang otomatis di seluruh density `mipmap` Android.
- **Splash Screen**: Layar pembuka warna gelap elegan (`#0f172a`) dengan logo tim.
- **Status Bar Native**: Warna dan tema gelap terintegrasi rapi dengan bezel ponsel.
- **Hardware Back Button Android**: Menekan tombol kembali fisik di Android akan menutup modal/kembali ke halaman sebelumnya tanpa langsung keluar dari aplikasi.
- **Izin Unggah & Kamera**: `AndroidManifest.xml` sudah dilengkapi izin akses penyimpanan dan kamera untuk lampiran narasumber/tugas.
- **Push Notification Native (Tugas Baru)**:
  - Saluran notifikasi Android (`task_alerts`) dengan prioritas tinggi (*Heads-up banner*, bunyi dering, dan getar).
  - Integrasi listener real-time (Supabase Realtime) yang mendeteksi setiap penugasan tugas baru dan memicu notifikasi native ke status bar Android.
  - Klik pada notifikasi akan otomatis melakukan *deep-linking* membuka detail tugas yang bersangkutan.
  - Tombol **"Uji Push Notifikasi"** tersedia di menu **Profil Pegawai** dan **Pengaturan Admin** untuk memverifikasi langsung di ponsel.

