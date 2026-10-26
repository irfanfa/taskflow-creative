import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export interface HolidayFlyerDefinition {
  nama: string; // contoh: 'Hari Sumpah Pemuda'
  tanggal: string; // YYYY-MM-DD
  kategoriHari: 'libur_nasional' | 'hari_peringatan';
  temaDeskripsi?: string;
}

/**
 * Daftar Hari-Hari Besar Nasional Indonesia Mendatang (2026 - 2027)
 */
export const UPCOMING_INDONESIAN_HOLIDAYS: HolidayFlyerDefinition[] = [
  // 2026
  {
    nama: 'Hari Sumpah Pemuda 2026',
    tanggal: '2026-10-28',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Sumpah Pemuda ke-98: Bersatu Majukan Bangsa',
  },
  {
    nama: 'Hari Pahlawan Nasional 2026',
    tanggal: '2026-11-10',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Pahlawan Nasional: Semangat Kepahlawanan untuk Kemajuan Negeri',
  },
  {
    nama: 'Hari Guru Nasional 2026',
    tanggal: '2026-11-25',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Guru Nasional & HUT PGRI: Dedikasi Guru Mencerahkan Bangsa',
  },
  {
    nama: 'Hari Menanam Pohon Indonesia 2026',
    tanggal: '2026-11-28',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Aksi Lingkungan: Hari Menanam Pohon Indonesia untuk Kelestarian Alam',
  },
  {
    nama: 'Hari Hak Asasi Manusia (HAM) 2026',
    tanggal: '2026-12-10',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Hak Asasi Manusia Sedunia',
  },
  {
    nama: 'Hari Ibu Nasional 2026',
    tanggal: '2026-12-22',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Ibu Nasional: Perempuan Berdaya, Indonesia Maju',
  },
  {
    nama: 'Hari Raya Natal 2026',
    tanggal: '2026-12-25',
    kategoriHari: 'libur_nasional',
    temaDeskripsi: 'Ucapan Selamat Hari Raya Natal 2026 dan Damai Sejahtera',
  },

  // 2027
  {
    nama: 'Tahun Baru Masehi 2027',
    tanggal: '2027-01-01',
    kategoriHari: 'libur_nasional',
    temaDeskripsi: 'Ucapan Selamat Tahun Baru 2027: Lembaran Baru, Semangat dan Dedikasi Baru',
  },
  {
    nama: 'Hari Gerakan Satu Juta Pohon 2027',
    tanggal: '2027-01-10',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Aksi Konservasi Hijau Hari Gerakan Satu Juta Pohon',
  },
  {
    nama: 'Hari Gizi Nasional 2027',
    tanggal: '2027-01-25',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Gizi Nasional untuk Generasi Bangsa Sehat dan Unggul',
  },
  {
    nama: 'Hari Kanker Sedunia 2027',
    tanggal: '2027-02-04',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan World Cancer Day: Tingkatkan Kepedulian dan Pola Hidup Sehat',
  },
  {
    nama: 'Isra Mi’raj Nabi Muhammad SAW 2027',
    tanggal: '2027-02-05',
    kategoriHari: 'libur_nasional',
    temaDeskripsi: 'Peringatan Isra Mi’raj Nabi Muhammad SAW 1448 H',
  },
  {
    nama: 'Tahun Baru Imlek 2578 Kongzili',
    tanggal: '2027-02-06',
    kategoriHari: 'libur_nasional',
    temaDeskripsi: 'Ucapan Selamat Tahun Baru Imlek 2578 Kongzili: Harmoni, Sukacita & Kemakmuran',
  },
  {
    nama: 'Hari Pers Nasional 2027',
    tanggal: '2027-02-09',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Pers Nasional (HPN): Pers Berintegritas Pilar Demokrasi',
  },
  {
    nama: 'Hari Peduli Sampah Nasional 2027',
    tanggal: '2027-02-21',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Peduli Sampah Nasional: Kurangi Sampah Jaga Bumi Bersih',
  },
  {
    nama: 'Hari Musik Nasional 2027',
    tanggal: '2027-03-09',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Musik Nasional: Apresiasi Musisi dan Karya Seni Nusantara',
  },
  {
    nama: 'Hari Suci Nyepi Tahun Baru Saka 1949',
    tanggal: '2027-03-09',
    kategoriHari: 'libur_nasional',
    temaDeskripsi: 'Selamat Hari Suci Nyepi Tahun Baru Saka 1949: Mulat Sarira Menuju Ketenangan Batin',
  },
  {
    nama: 'Hari Raya Idul Fitri 1448 H (Hari ke-1)',
    tanggal: '2027-03-23',
    kategoriHari: 'libur_nasional',
    temaDeskripsi: 'Selamat Hari Raya Idul Fitri 1448 H: Minal Aidin Wal Faidzin, Mohon Maaf Lahir dan Batin',
  },
  {
    nama: 'Hari Raya Idul Fitri 1448 H (Hari ke-2)',
    tanggal: '2027-03-24',
    kategoriHari: 'libur_nasional',
    temaDeskripsi: 'Ucapan Kebersamaan dan Silaturahmi Hari Raya Idul Fitri 1448 H',
  },
  {
    nama: 'Wafat Yesus Kristus (Jumat Agung) 2027',
    tanggal: '2027-03-26',
    kategoriHari: 'libur_nasional',
    temaDeskripsi: 'Peringatan Wafat Yesus Kristus (Jumat Agung)',
  },
  {
    nama: 'Hari Kartini 2027',
    tanggal: '2027-04-21',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Kartini: Menyalakan Semangat Emansipasi dan Inspirasi Perempuan Indonesia',
  },
  {
    nama: 'Hari Bumi Sedunia 2027',
    tanggal: '2027-04-22',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Bumi (Earth Day): Lindungi Bumi Rumah Kita Bersama',
  },
  {
    nama: 'Hari Buruh Internasional 2027',
    tanggal: '2027-05-01',
    kategoriHari: 'libur_nasional',
    temaDeskripsi: 'Peringatan Hari Buruh Internasional (May Day): Kerja Keras Menghargai Martabat Bangsa',
  },
  {
    nama: 'Hari Pendidikan Nasional (Hardiknas) 2027',
    tanggal: '2027-05-02',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Pendidikan Nasional: Bergerak Bersama Semarakkan Pendidikan Berkualitas',
  },
  {
    nama: 'Kenaikan Yesus Kristus 2027',
    tanggal: '2027-05-06',
    kategoriHari: 'libur_nasional',
    temaDeskripsi: 'Peringatan Kenaikan Yesus Kristus',
  },
  {
    nama: 'Hari Raya Waisak 2571 BE',
    tanggal: '2027-05-20',
    kategoriHari: 'libur_nasional',
    temaDeskripsi: 'Selamat Hari Trisuci Waisak 2571 BE: Sabbe Satta Bhavantu Sukhitatta',
  },
  {
    nama: 'Hari Kebangkitan Nasional (Harkitnas) 2027',
    tanggal: '2027-05-20',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Kebangkitan Nasional: Kobarkan Semangat Gotong Royong Bangsa',
  },
  {
    nama: 'Hari Lahir Pancasila 2027',
    tanggal: '2027-06-01',
    kategoriHari: 'libur_nasional',
    temaDeskripsi: 'Peringatan Hari Lahir Pancasila: Pancasila Jiwa Pemersatu Bangsa Menuju Indonesia Emas',
  },
  {
    nama: 'Tahun Baru Islam 1449 Hijriah',
    tanggal: '2027-06-06',
    kategoriHari: 'libur_nasional',
    temaDeskripsi: 'Selamat Tahun Baru Islam 1 Muharram 1449 H: Semangat Hijrah Menuju Kebaikan',
  },
  {
    nama: 'Hari Kemerdekaan Republik Indonesia ke-82',
    tanggal: '2027-08-17',
    kategoriHari: 'libur_nasional',
    temaDeskripsi: 'Dirgahayu Republik Indonesia ke-82: Nusantara Baru, Indonesia Maju',
  },
  {
    nama: 'Maulid Nabi Muhammad SAW 2027',
    tanggal: '2027-08-15',
    kategoriHari: 'libur_nasional',
    temaDeskripsi: 'Peringatan Maulid Nabi Muhammad SAW 1449 H: Meneladani Akhlak Mulia Rasulullah',
  },
  {
    nama: 'Hari Kesaktian Pancasila 2027',
    tanggal: '2027-10-01',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Kesaktian Pancasila: Menjaga Keutuhan Ideologi Bangsa',
  },
  {
    nama: 'Hari Batik Nasional 2027',
    tanggal: '2027-10-02',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Batik Nasional: Bangga Mengenakan Warisan Budaya Nusantara',
  },
  {
    nama: 'Hari Tentara Nasional Indonesia (TNI) 2027',
    tanggal: '2027-10-05',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Dirgahayu Tentara Nasional Indonesia: Patriot NKRI Pengawal Kedaulatan',
  },
  {
    nama: 'Hari Sumpah Pemuda 2027',
    tanggal: '2027-10-28',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Sumpah Pemuda ke-99: Maju Bersama Pemuda Indonesia',
  },
  {
    nama: 'Hari Pahlawan 2027',
    tanggal: '2027-11-10',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Pahlawan Nasional: Teruskan Perjuangan Demi Kemandirian Bangsa',
  },
  {
    nama: 'Hari Ibu Nasional 2027',
    tanggal: '2027-12-22',
    kategoriHari: 'hari_peringatan',
    temaDeskripsi: 'Peringatan Hari Ibu Nasional 2027',
  },
  {
    nama: 'Hari Raya Natal 2027',
    tanggal: '2027-12-25',
    kategoriHari: 'libur_nasional',
    temaDeskripsi: 'Ucapan Selamat Hari Raya Natal 2027',
  },
];

/**
 * Otomatisasi: Sinkronisasi Tugas Desain E-Flyer Hari Besar Nasional Indonesia
 * Memeriksa daftar hari besar mendatang dan membuat tugas baru jika belum ada di database.
 */
export async function syncUpcomingHolidayFlyers(options?: {
  createdById?: string;
  assigneeId?: string;
  forceFromDate?: string;
}) {
  const supabase = createAdminClient() as any;

  // 1. Tentukan tanggal batas awal (default: hari ini di Indonesia WIB)
  const todayWib = options?.forceFromDate || new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  // 2. Ambil data Admin default dan Pegawai (KMB) default
  let creatorId = options?.createdById;
  let defaultAssigneeId = options?.assigneeId;

  if (!creatorId || !defaultAssigneeId) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role, email')
      .in('role', ['admin', 'pegawai']);

    if (profiles && profiles.length > 0) {
      if (!creatorId) {
        const adminUser = profiles.find((p: any) => p.role === 'admin');
        creatorId = adminUser?.id || profiles[0].id;
      }
      if (!defaultAssigneeId) {
        // Prioritaskan akun bersama Pegawai (KMB) kmb@kmbteam.com
        const kmbUser = profiles.find((p: any) => p.email === 'kmb@kmbteam.com' || p.email === 'pegawai@taskflow.local');
        const anyPegawai = profiles.find((p: any) => p.role === 'pegawai');
        defaultAssigneeId = kmbUser?.id || anyPegawai?.id;
      }
    }
  }

  // 3. Filter hari besar yang tanggalnya >= hari ini
  const upcomingHolidays = UPCOMING_INDONESIAN_HOLIDAYS.filter(
    (h) => h.tanggal >= todayWib
  );

  if (upcomingHolidays.length === 0) {
    return {
      success: true,
      createdCount: 0,
      existingCount: 0,
      message: 'Tidak ada hari besar mendatang yang perlu dibuat.',
      createdTasks: [],
    };
  }

  // 4. Ambil tugas yang sudah ada di database untuk mencegah duplikasi
  const { data: existingTasks } = await supabase
    .from('tasks')
    .select('id, judul, deadline')
    .ilike('judul', '%E-Flyer%')
    .is('deleted_at', null);

  const existingTitles = new Set(
    (existingTasks || []).map((t: any) => t.judul.toLowerCase().trim())
  );

  const createdTasks: Array<{ id: string; judul: string; deadline: string }> = [];
  let existingCount = 0;

  for (const holiday of upcomingHolidays) {
    const taskTitle = `Desain E-Flyer ${holiday.nama}`;

    // Cek apakah sudah pernah ada
    if (existingTitles.has(taskTitle.toLowerCase().trim())) {
      existingCount++;
      continue;
    }

    // Tentukan prioritas: Hari Libur Nasional = Tinggi, Hari Peringatan = Sedang
    const prioritas = holiday.kategoriHari === 'libur_nasional' ? 'Tinggi' : 'Sedang';

    // Deadline: Pukul 09.00 WIB pada hari H
    const deadlineIso = `${holiday.tanggal}T09:00:00+07:00`;

    // Tanggal Mulai: 5 hari sebelum hari H (atau hari ini jika kurang dari 5 hari)
    const holidayDate = new Date(`${holiday.tanggal}T00:00:00+07:00`);
    const startDateObj = new Date(holidayDate);
    startDateObj.setDate(startDateObj.getDate() - 5);
    const startDateStr = startDateObj.toISOString().slice(0, 10);
    const effectiveStartDate = startDateStr < todayWib ? todayWib : startDateStr;
    const tanggalMulaiIso = `${effectiveStartDate}T08:00:00+07:00`;

    const deskripsi = `Instruksi Pengerjaan Desain E-Flyer Resmi:
Tema / Acara: ${holiday.nama}
${holiday.temaDeskripsi ? `Fokus Pesan: "${holiday.temaDeskripsi}"\n` : ''}
Ketentuan Teknis Publikasi Media Sosial:
1. Format & Ukuran:
   - Feed Instagram / Portal: Rasio 1:1 (Resolusi 1080 x 1080 px)
   - Story Media Sosial: Rasio 9:16 (Resolusi 1080 x 1920 px)
2. Konten Visual Wajib:
   - Logo resmi instansi (posisi proporsional di sudut atas)
   - Ucapan peringatan / selamat yang rapi, santun, dan formal
   - Elemen ilustrasi / ornamen grafis tematik yang relevan dan elegan
3. Penyerahan Hasil Kerja:
   - Lampirkan link Google Drive / Figma / Cloud Storage pada kolom "Tautan Hasil Akhir".
   - Pastikan akses tautan dapat dibuka (View / Comment) oleh Administrator.`;

    // Insert tugas ke tabel tasks
    const insertPayload: any = {
      judul: taskTitle,
      deskripsi,
      jenis_pekerjaan: 'Desain E-Flyer',
      klien_proyek: 'Internal Instansi',
      prioritas,
      status: 'Belum Dimulai',
      tanggal_mulai: tanggalMulaiIso,
      deadline: deadlineIso,
      created_by: creatorId || null,
      spesifikasi_teknis: {
        is_hari_besar: true,
        holiday_name: holiday.nama,
        kategori_hari: holiday.kategoriHari,
      },
      perlu_upload_sosmed: true, // Seluruh hari besar nasional otomatis ditandai untuk diposting ke sosmed
    };

    let { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert(insertPayload)
      .select('id, judul, deadline')
      .single();

    // Fallback otomatis jika kolom perlu_upload_sosmed belum dibuat di database Supabase
    if (taskError && (taskError.code === '42703' || taskError.message?.includes('perlu_upload_sosmed'))) {
      delete insertPayload.perlu_upload_sosmed;
      const retry = await supabase
        .from('tasks')
        .insert(insertPayload)
        .select('id, judul, deadline')
        .single();
      newTask = retry.data;
      taskError = retry.error;
    }

    if (taskError || !newTask) {
      console.error(`Gagal membuat tugas e-flyer ${taskTitle}:`, taskError?.message || taskError);
      continue;
    }

    createdTasks.push(newTask);
    existingTitles.add(taskTitle.toLowerCase().trim());

    // Hubungkan Pelaksana / PJ Pegawai (KMB)
    if (defaultAssigneeId) {
      await supabase.from('task_assignees').insert({
        task_id: newTask.id,
        user_id: defaultAssigneeId,
      });
    }

    // Catat ke Log Aktivitas jika ada user yang valid
    const activityUserId = creatorId || defaultAssigneeId;
    if (activityUserId) {
      await supabase.from('task_activities').insert({
        task_id: newTask.id,
        user_id: activityUserId,
        action_type: 'task_created_holiday',
        description: `Tugas otomatis dibuat untuk peringatan hari besar: ${holiday.nama}`,
        new_value: 'Belum Dimulai',
      });
    }
  }

  try {
    revalidatePath('/admin/tugas');
    revalidatePath('/admin');
    revalidatePath('/admin/kalender');
    revalidatePath('/pegawai');
    revalidatePath('/pegawai/kalender');
    revalidatePath('/sosmed/tugas-posting');
  } catch {
    // Abaikan jika dijalankan di luar request context Next.js
  }

  return {
    success: true,
    createdCount: createdTasks.length,
    existingCount,
    message: createdTasks.length > 0
      ? `Berhasil menambahkan ${createdTasks.length} tugas desain e-flyer hari besar baru: ${createdTasks.map((t) => t.judul.replace('Desain E-Flyer ', '')).join(', ')}.`
      : `Seluruh tugas desain e-flyer hari besar mendatang (${existingCount} tugas) sudah tersinkronisasi di database. Tidak ada tugas baru yang perlu dibuat.`,
    createdTasks,
  };
}
