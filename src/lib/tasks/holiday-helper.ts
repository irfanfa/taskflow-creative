/**
 * Helper untuk identifikasi tugas Peringatan Hari Besar Nasional / Libur Nasional.
 * Client-safe dan dapat digunakan di server maupun client components.
 */

export interface HolidayCheckableTask {
  judul?: string | null;
  deskripsi?: string | null;
  jenis_pekerjaan?: string | null;
  spesifikasi_teknis?: Record<string, any> | null;
}

/**
 * Daftar kata kunci nama Hari Besar Nasional, Hari Keagamaan, & Peringatan Nasional Indonesia.
 */
export const INDONESIAN_HOLIDAY_KEYWORDS: string[] = [
  'sumpah pemuda',
  'pahlawan',
  'guru nasional',
  'menanam pohon',
  'hak asasi manusia',
  'hari ibu',
  'natal',
  'tahun baru',
  'satu juta pohon',
  'gizi nasional',
  'kanker sedunia',
  'isra mi',
  'isra miraj',
  'imlek',
  'pers nasional',
  'peduli sampah',
  'musik nasional',
  'nyepi',
  'idul fitri',
  'idul adha',
  'wafat yesus',
  'jumat agung',
  'kartini',
  'hari bumi',
  'hari buruh',
  'hardiknas',
  'pendidikan nasional',
  'kenaikan yesus',
  'kenaikan isa almasih',
  'waisak',
  'kebangkitan nasional',
  'harkitnas',
  'lahir pancasila',
  'kesaktian pancasila',
  'kemerdekaan',
  'hut ri',
  'dirgahayu ri',
  'maulid',
  'batik nasional',
  'tentara nasional indonesia',
  'hari tni',
  'hari santri',
  'hari anak nasional',
  'hari pers',
  'hari kesaktian',
];

/**
 * Memeriksa apakah sebuah tugas merupakan tugas peringatan Hari Besar Nasional / Hari Libur.
 * Menghindari false positive pada tugas umum yang hanya kebetulan berjenis 'Desain E-Flyer'
 * atau tugas dengan kata biasa seperti 'hari' atau 'flyer'.
 */
export function isHolidayTask(task: HolidayCheckableTask | null | undefined): boolean {
  if (!task) return false;

  // 1. Cek metadata spesifikasi_teknis eksplisit
  const st = task.spesifikasi_teknis;
  if (
    st &&
    typeof st === 'object' &&
    (st.is_hari_besar === true ||
      st.kategori === 'hari_besar' ||
      st.is_holiday === true)
  ) {
    return true;
  }

  // 2. Cek apakah dibuat dari template otomatisasi hari besar (berdasarkan format deskripsi resmi)
  const desc = (task.deskripsi || '').toLowerCase();
  if (
    desc.includes('instruksi pengerjaan desain e-flyer resmi') ||
    desc.includes('hari besar nasional') ||
    desc.includes('hari libur nasional') ||
    (desc.includes('tema / acara:') && (desc.includes('hari') || desc.includes('peringatan') || desc.includes('ucapan')))
  ) {
    return true;
  }

  // 3. Cek judul tugas
  const title = (task.judul || '').toLowerCase().trim();
  if (!title) return false;

  // Frasa umum hari besar / libur
  if (
    title.includes('hari besar') ||
    title.includes('hari libur') ||
    title.includes('peringatan hari') ||
    title.includes('selamat hari raya') ||
    title.includes('dirgahayu ri') ||
    title.includes('hut ri')
  ) {
    return true;
  }

  // Cek kecocokan kata kunci hari besar tertentu
  for (const keyword of INDONESIAN_HOLIDAY_KEYWORDS) {
    if (title.includes(keyword)) {
      return true;
    }
  }

  return false;
}
