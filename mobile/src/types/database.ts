export type UserRole = 'admin' | 'pep' | 'pegawai' | 'sosmed';

export type UserSpecialization = 'Video Editor' | 'Desainer Grafis' | null;

export interface Profile {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  spesialisasi: UserSpecialization;
  status_aktif: boolean;
  foto: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskPriority = 'Rendah' | 'Sedang' | 'Tinggi' | 'Urgent';

export type TaskStatus =
  | 'Dalam Antrean'
  | 'Belum Dimulai'
  | 'Sedang Dikerjakan'
  | 'Menunggu Review'
  | 'Revisi'
  | 'Selesai';

export interface TechnicalSpecs {
  durasi?: string;
  resolusi?: string;
  rasio?: string;
  ukuran?: string;
  [key: string]: string | undefined;
}

export interface Task {
  id: string;
  judul: string;
  deskripsi: string | null;
  jenis_pekerjaan: string;
  klien_proyek: string;
  prioritas: TaskPriority;
  tanggal_mulai: string;
  deadline: string;
  status: TaskStatus;
  spesifikasi_teknis?: TechnicalSpecs;
  assigned_to?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  // Relasi
  assigned_profile?: Profile | null;
  creator_profile?: Profile | null;
}
