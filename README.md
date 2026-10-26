# TaskFlow Creative 🎨🎬

Platform monitoring dan kolaborasi tugas tim kreatif (**Video Editor** dan **Desainer Grafis**) dengan otomatisasi pengingat deadline berbasis zona waktu **Asia/Jakarta (WIB)**.

---

## 🌟 Fitur Utama Aplikasi

1. **Autentikasi & Otorisasi Ketat (RBAC)**:
   - Panel khusus **Administrator** (`/admin`) dan **Pegawai Kreatif** (`/pegawai`).
   - Proteksi middleware di sisi server dengan pengalihan otomatis berdasarkan role.
   - Fitur keamanan login dengan perlindungan *Brute-Force Rate Limiting* (maksimal 5 kali gagal per 15 menit) dan sanitasi input server-side.
2. **Visualisasi Pekerjaan (Kanban & Kalender)**:
   - Tampilan **Kanban Board** interaktif dengan *drag-and-drop* perubahan status.
   - **Kalender Tim** (admin) dan **Kalender Saya** (pegawai) dengan visualisasi warna berbasis urgensi prioritas (Rendah, Sedang, Tinggi, Urgent).
   - Filter cepat kategori pekerjaan (*Video Editing* vs *Desain E-Flyer*), status, dan pegawai.
3. **Sistem Notifikasi & Pengingat Deadline Otomatis**:
   - Engine pengingat berkala: **H-3 Hari** (info awal), **H-1 Hari** (peringatan), **3 Jam Sebelum Deadline** (mendesak), dan **Lewat Deadline** (eskalasi keterlambatan, diulang tiap 24 jam).
   - Tembusan otomatis ke seluruh Administrator untuk tugas berprioritas *Tinggi* dan *Urgent*.
   - Notifikasi multi-channel: **In-App** (lonceng header + badge belum dibaca) dan **Email** via Resend.
   - Pusat Notifikasi lengkap dengan filter, tandai telah dibaca, dan hapus riwayat.
   - Tabel audit log (`notification_logs`) untuk menjamin **tidak ada pengiriman ganda** pada tahap yang sama.
4. **Alur Kolaborasi Lengkap**:
   - **Siklus Review**: Admin dapat *Setujui* (status Selesai) atau *Minta Revisi* (wajib mengisi catatan perbaikan; jumlah revisi otomatis terakumulasi).
   - **Diskusi & @Mention**: Komentar detail tugas dengan deteksi `@mention` otomatis yang memicu notifikasi langsung ke rekan kerja terkait.
   - **Lampiran Fleksibel**: Upload file langsung ke Supabase Storage (maksimal 25 MB per file, dukungan format desain & video: PNG, JPG, PSD, AI, MP4, MOV, ZIP, PDF) selain tautan eksternal (Google Drive / Figma).
   - **Checklist Subtask**: Pemecahan tahapan tugas (contoh: *Rough Cut*, *Color Grading*, *Audio Master*, *Export*) dengan kalkulasi persentase progres dinamis pada kartu tugas.
   - **Pelacak Waktu (Time Tracking)**: Stopwatch *Mulai/Berhenti* dan input manual. Aturan ketat: **hanya satu timer aktif per pegawai** (otomatis menghentikan timer sebelumnya jika memulai tugas lain).
   - **Activity Log Task**: Catatan audit trail setiap perubahan status, deadline, lampiran, komentar, dan review.
5. **Laporan Kinerja & Ekspor Dokumen**:
   - Filter rentang tanggal fleksibel (7 hari, bulan ini, bulan lalu, kuartal, custom date).
   - 5 KPI Utama: Total tugas selesai, persentase tepat waktu (*On-Time Rate*), rata-rata durasi pengerjaan, akumulasi jam kerja riil, dan rasio revisi per staf.
   - Grafik distribusi jam kerja harian, rasio kategori, dan tabel peringkat kinerja tim.
   - **Ekspor Dokumen**:
     - **Excel (.xlsx)**: 3 sheet terstruktur (*Ringkasan Metrik*, *Kinerja Tim*, dan *Rincian Tugas*).
     - **PDF (.pdf)**: Dokumen beresolusi tinggi dengan tata letak profesional siap cetak.
6. **Template Tugas & Tugas Berulang (Scheduler)**:
   - Template siap pakai (*Reels Instagram 30 Detik*, *E-Flyer Promo Feed*, dll.) yang otomatis mengisi spesifikasi teknis dinamis dan checklist subtask standar.
   - Tugas berulang otomatis (Harian, Mingguan berdasarkan hari, atau Bulanan berdasarkan tanggal) yang di-generate tepat waktu oleh sistem scheduler.
   - Peringatan beban kerja tim (*Workload Warning*): Peringatan dini di form admin jika pegawai telah mencapai batas maksimal tugas aktif yang dapat dikonfigurasi.
7. **Polesan Akhir & Produktivitas**:
   - **Mode Gelap (Dark Mode)**: Beralih instan antara mode terang dan gelap melalui tombol di header (tersimpan di *local storage* tanpa efek kedip anti-FOUC).
   - **PWA (Progressive Web App)**: Dapat diinstal langsung di layar utama smartphone / desktop lengkap dengan dukungan offline service worker dan push notifications.
   - **Aksesibilitas & Responsivitas Penuh**: Dioptimalkan untuk perangkat mobile, tablet, hingga layar desktop lebar.

---

## 👥 Akun Pengguna Sistem (3 Peran Utama)

Kredensial bawaan untuk seluruh akun (dapat login dengan username singkat maupun alamat email):
- **Kata Sandi (Password)**: `Password123!`

| Role / Peran | Nama Akun | Username | Alamat Email Resmi | Akses & Wewenang |
|---|---|---|---|---|
| **Ketua Tim (Admin)** | Ketua Tim (Admin) | `katim` | `katim@kmbteam.com` | Memantau semua tugas (termasuk tugas dari PEP), kelola template, pengaturan, laporan, dan persetujuan tugas admin |
| **PEP (Siaran)** | PEP (Siaran) | `pep` | `pep@kmbteam.com` | Membuat tugas siaran, memantau tugas buatannya sendiri, dan langsung menyetujui / meminta revisi hasil kerja tanpa persetujuan Ketua Tim (tanpa kalender & tanpa pengerjaan) |
| **Pegawai (KMB)** | Pegawai (KMB) | `kmb` | `kmb@kmbteam.com` | 1 akun bersama untuk tim pelaksana: mengerjakan tugas, checklist subtask, upload hasil kerja, dan pelacak waktu (timer) |

> [!TIP]
> Pada halaman login (`/login`), terdapat tombol pintas 1-klik untuk otomatis mengisi kredensial ketiga akun di atas untuk mempercepat pengujian alur kerja.

---

## 💻 Panduan Menjalankan Aplikasi (Lokal)

### 1. Prasyarat Sistem
- **Node.js**: Versi 18.17.0 atau lebih baru (disarankan Node.js 20 LTS).
- **npm** atau **yarn** / **pnpm**.
- Proyek [Supabase](https://supabase.com) (gratis).

### 2. Instalasi Dependensi
Cukup jalankan satu perintah:
```bash
npm install
```

### 3. Konfigurasi Environment Variable
Salin template `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```
Sesuaikan nilainya dengan konfigurasi proyek Supabase Anda:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_TIMEZONE=Asia/Jakarta

# Email Service (Resend - Opsional)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=TaskFlow Creative <notifications@yourdomain.com>

# Scheduler / Cron Security Token
CRON_SECRET=token-keamanan-acak-untuk-cron
```

### 4. Setup Database Supabase dari Nol
Buka dashboard Supabase Anda di menu **SQL Editor**, lalu jalankan file skrip berikut **secara berurutan**:

1. **`supabase/migrations/20261024000000_init_profiles.sql`**: Membuat skema tabel `profiles`, trigger registrasi user, dan fungsi `is_admin()`.
2. **`supabase/seed.sql`**: Mendaftarkan akun auth awal untuk 1 Admin dan 4 Pegawai.
3. **`supabase/setup_notifications.sql`**: Membuat tabel `tasks`, `task_assignees`, `task_categories`, `notifications`, `notification_logs`, dan pengaturan sistem.
4. **`supabase/setup_collaboration.sql`**: Membuat tabel `task_comments`, `task_attachments`, `task_subtasks`, `task_time_logs`, dan `task_activities`.
5. **`supabase/setup_productivity.sql`**: Membuat tabel `task_templates`, `recurring_tasks`, dan template standar bawaan.
6. **`supabase/setup_polishing.sql`**: Mengonfigurasi `daily_digest_enabled`, audit kebijakan RLS lengkap, serta membuat storage buckets `task-attachments` dan `avatars`.

*(Opsional data simulasi): Jalankan `supabase/seed_tasks.sql` untuk mengisi data contoh tugas, aktivitas, komentar, dan log waktu.*

### 5. Jalankan Server Pengembangan
```bash
npm run dev
```
Akses aplikasi melalui peramban web di: **`http://localhost:3000`**

---

## ⏰ Konfigurasi Scheduler & Cron Jobs

Aplikasi menyediakan 2 endpoint scheduler otomatis:

| Endpoint | Jadwal Rekomendasi | Deskripsi |
|---|---|---|
| `/api/cron/reminders` | Setiap 15 Menit (`*/15 * * * *`) | Memeriksa deadline aktif (H-3, H-1, 3 Jam, Overdue) dan mengirim pengingat. |
| `/api/cron/recurring-tasks` | Setiap Hari pukul 00.05 WIB (`5 17 * * *` UTC) | Men-generate tugas baru berdasarkan jadwal perulangan yang jatuh tempo hari ini. |

### Menjalankan Scheduler Secara Otomatis:

#### Opsi A: Vercel Cron (Otomatis Aktif Saat Deploy ke Vercel)
File konfigurasi `vercel.json` sudah terintegrasi di root direktori. Vercel akan otomatis mengeksekusi ketiga endpoint sesuai jadwal yang ditentukan.

#### Opsi B: Supabase `pg_cron` (Eksekusi Internal Database)
Aktifkan ekstensi `pg_cron` dan `pg_net` di Supabase, lalu jadwalkan HTTP request ke endpoint aplikasi Anda:
```sql
SELECT cron.schedule('evaluasi-deadline-15m', '*/15 * * * *', $$
  SELECT net.http_get(
    url := 'https://nama-domain-anda.vercel.app/api/cron/reminders',
    headers := '{"Authorization": "Bearer token-keamanan-anda"}'::jsonb
  );
$$);
```

#### Opsi C: Pemicu Manual dari Dashboard Admin
Administrator dapat sewaktu-waktu menguji atau memicu eksekusi engine secara langsung tanpa menunggu cron melalui menu **Pengaturan Sistem** (`/admin/pengaturan`):
- Tombol **"Jalankan Evaluasi Pengingat Sekarang"** (Pengingat Deadline)
- Tombol **"Jalankan Generator Hari Ini"** (Tugas Berulang)

---

## 🧪 Menjalankan Automated Unit Tests

Aplikasi dilengkapi dengan suite pengujian unit menyeluruh yang mencakup:
- Hak akses antar role (RBAC Matrix).
- Logika penentuan tahap pengingat deadline dan pencegahan duplikasi pengiriman.
- Aturan ketat single active timer per pegawai.
- Validasi lampiran file (ukuran maks 25 MB & tipe format file).
- Deteksi parser `@mention` pada komentar.
- Siklus hidup review kolaborasi lengkap (*Submit &rarr; Revision &rarr; Resubmit &rarr; Approve*).
- Kalkulasi progres checklist subtask.
- Evaluasi peringatan batas beban kerja pegawai (*Workload Warning*).
- Engine penjadwalan tugas berulang (*Recurring Tasks*).
- Penghitungan akurat metrik laporan efisiensi KPI.
- Rate limiting pada login.

Untuk menjalankan seluruh rangkaian pengujian:
```bash
npm test
```
Hasil pengujian:
```text
✔ TAHAP 5: Alur Kolaborasi Unit Tests (pass)
✔ Tahap 6: Laporan dan Fitur Produktivitas (pass)
✔ Unit Test: Logika Penentuan Tahap Pengingat Deadline (pass)
✔ Unit Test: Logika Pencegahan Duplikasi Pengiriman (pass)
✔ Tahap 7: Security Audit, RBAC & Comprehensive Workflow Tests (pass)
ℹ tests 36 | suites 19 | pass 36 | fail 0
```

---

## 🚀 Panduan Deploy ke Produksi (Vercel + Supabase)

### 1. Deploy Frontend ke Vercel
1. Unggah kode ke repositori GitHub / GitLab / Bitbucket Anda.
2. Buka [Vercel Dashboard](https://vercel.com) dan buat proyek baru (*Add New &rarr; Project*).
3. Pilih repositori proyek `taskflow-creative`.
4. Pada bagian **Environment Variables**, tambahkan seluruh variabel lingkungan dari `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (Domain produksi Anda, contoh: `https://taskflow.vercel.app`)
   - `NEXT_PUBLIC_TIMEZONE` (`Asia/Jakarta`)
   - `RESEND_API_KEY` (Kunci API Resend Anda)
   - `RESEND_FROM_EMAIL` (Email domain pengirim)
   - `CRON_SECRET` (Token otorisasi pengaman cron)
5. Klik tombol **Deploy**. Aplikasi akan otomatis dikompilasi dan terbit ke jaringan global CDN.

### 2. Konfigurasi Auth Redirect URL di Supabase
1. Buka dashboard Supabase &rarr; **Authentication** &rarr; **URL Configuration**.
2. Ubah **Site URL** menjadi domain produksi Anda (contoh: `https://taskflow.vercel.app`).
3. Tambahkan URL pengalihan di **Redirect URLs**:
   - `https://taskflow.vercel.app/**`
   - `https://taskflow.vercel.app/api/auth/callback`

---

## 🛡️ Audit Keamanan & Kepatuhan Data

- **Row Level Security (RLS)**: Diaktifkan secara menyeluruh di level database PostgreSQL pada seluruh tabel untuk menjamin isolasi data antar role dan pengguna.
- **Penyimpanan Kredensial**: Bebas dari hardcoded secrets; seluruh kredensial dan API keys disimpan melalui *environment variables* yang terlindungi.
- **Validasi Server-Side**: Seluruh Server Actions dan API routes memvalidasi identitas sesi, hak akses role, serta format input sebelum melakukan mutasi data.
- **Proteksi Brute Force**: Rate limiter membatasi percobaan login yang berulang guna mencegah serangan tebakan kata sandi.

---

## 📄 Lisensi

Dikembangkan dengan standar arsitektur modern Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, dan Supabase. Seluruh hak cipta dilindungi.
