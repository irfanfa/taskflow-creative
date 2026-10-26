# KMB Team Creative - Mobile Native (React Native & Expo)

Aplikasi mobile **Full Native** (bukan webview) untuk manajemen tugas tim kreatif RRI Surabaya.

## ✨ Fitur Utama Versi Native
- **100% Native Mobile UI**: Dibangun dengan React Native 0.88 & Expo 58 (Komponen asli OS: `View`, `Text`, `FlatList`, `Modal`).
- **Autentikasi Aman**: Terhubung langsung ke Supabase Auth dengan sesi login tersimpan di `AsyncStorage` (auto-login).
- **Sinkronisasi Realtime**: Menggunakan Supabase Realtime WebSocket — tugas yang ditugaskan atau status yang diubah langsung ter-update di layar HP seketika.
- **Fast Pull-to-Refresh**: Tarik layar ke bawah untuk memperbarui daftar tugas.
- **Quick Status Action**: Pegawai/Admin dapat mengubah status tugas langsung dari modal detail (Kerjakan, Ajukan Review, Selesai).
- **Pencarian Cepat & Filter Tab**: Filter instan berdasarkan Berjalan, Review, Selesai, serta pencarian judul/klien.
- **Brand Identitas RRI**: Logo resmi RRI, warna biru `#1737D6`, dan latar belakang putih bersih (`#FFFFFF`).

---

## 📱 Cara Menjalankan di HP / Emulator

### Opsi 1: Jalankan Cepat dengan Expo Go (Tanpa Kabel / Scan QR)
1. Install aplikasi **Expo Go** dari Google Play Store di HP Android Anda.
2. Di terminal komputer, masuk ke folder `mobile`:
   ```bash
   cd mobile
   npm start
   ```
3. Scan QR Code yang muncul di terminal menggunakan kamera HP atau aplikasi Expo Go.
4. Aplikasi native langsung terbuka di HP Anda!

### Opsi 2: Jalankan di Emulator Android Studio
1. Buka Android Studio dan jalankan Emulator.
2. Di terminal folder `mobile`:
   ```bash
   npm run android
   ```

### Opsi 3: Build Menjadi File APK Mandiri (.apk)
Untuk membuat installer `.apk` mandiri yang bisa diinstall di HP tanpa butuh laptop:
```bash
npx expo prebuild
cd android
./gradlew assembleRelease
```
Atau menggunakan EAS Build gratis:
```bash
npx eas-cli build -p android --profile preview
```
