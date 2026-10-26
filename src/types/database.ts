export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

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
  deleted_at?: string | null;
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

export interface VideoSpecs {
  durasi?: string;
  resolusi?: string;
  rasio?: string;
  [key: string]: string | undefined;
}

export interface FlyerSpecs {
  ukuran?: string;
  [key: string]: string | undefined;
}

export type TechnicalSpecs = VideoSpecs & FlyerSpecs;

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
  spesifikasi_teknis: TechnicalSpecs;
  link_referensi: string | null;
  link_hasil: string | null;
  perlu_upload_sosmed?: boolean;
  status_posting?: 'menunggu_posting' | 'sudah_diposting' | null;
  link_posting?: string | null;
  catatan_posting?: string | null;
  posted_at?: string | null;
  posted_by?: string | null;
  poster?: Profile;
  revision_count?: number;
  catatan_revisi?: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignee {
  id: string;
  task_id: string;
  user_id: string;
  assigned_at: string;
  profile?: Profile;
}

export interface TaskWithAssignees extends Task {
  assignees?: {
    id: string;
    user_id: string;
    profile: Profile;
  }[];
  creator?: Profile;
  subtasks_total?: number;
  subtasks_completed?: number;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  pesan: string;
  mentions: string[];
  created_at: string;
  user?: Profile;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  uploader_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  kategori: 'brief' | 'hasil' | 'umum';
  created_at: string;
  uploader?: Profile;
}

export interface TaskSubtask {
  id: string;
  task_id: string;
  judul: string;
  is_completed: boolean;
  urutan: number;
  completed_at: string | null;
  created_at: string;
}

export interface TaskTimeLog {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number;
  is_running: boolean;
  catatan: string | null;
  created_at: string;
  user?: Profile;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  action_type: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user?: Profile;
}

export interface TaskCategory {
  id: string;
  nama: string;
  tipe: string;
  created_at: string;
}

export type NotificationType =
  | 'deadline_h3'
  | 'deadline_h1'
  | 'deadline_3h'
  | 'deadline_overdue'
  | 'tugas_baru'
  | 'tugas_diubah'
  | 'deadline_diubah'
  | 'hasil_review'
  | 'revisi_diminta'
  | 'tugas_selesai';

export interface Notification {
  id: string;
  user_id: string;
  tipe: NotificationType | string;
  judul: string;
  pesan: string;
  task_id: string | null;
  is_read: boolean;
  created_at: string;
  task?: Task | null;
}

export interface NotificationLog {
  id: string;
  task_id: string;
  user_id: string;
  stage: string;
  channel: 'in_app' | 'email';
  sent_at: string;
}

export interface SystemNotificationSettings {
  id: string;
  stage_h3_enabled: boolean;
  stage_h1_enabled: boolean;
  stage_3h_enabled: boolean;
  stage_overdue_enabled: boolean;
  cc_admin_urgent: boolean;
  max_active_tasks_per_employee?: number;
  updated_at: string;
}

export interface UserNotificationPreferences {
  user_id: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  updated_at: string;
}

export interface TaskTemplate {
  id: string;
  nama: string;
  deskripsi: string | null;
  jenis_pekerjaan: string;
  spesifikasi_teknis: TechnicalSpecs;
  default_subtasks: string[];
  prioritas_default: TaskPriority;
  estimasi_hari?: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type RecurringFrequency = 'harian' | 'mingguan' | 'bulanan';

export interface RecurringTask {
  id: string;
  judul: string;
  deskripsi: string | null;
  jenis_pekerjaan: string;
  klien_proyek: string;
  prioritas: TaskPriority;
  spesifikasi_teknis: TechnicalSpecs;
  link_referensi: string | null;
  frekuensi: RecurringFrequency;
  assignee_ids: string[];
  default_subtasks: string[];
  jam_deadline: string;
  hari_dalam_minggu: number | null;
  tanggal_dalam_bulan: number | null;
  tanggal_mulai: string;
  tanggal_berakhir: string | null;
  terakhir_dibuat: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          nama: string;
          email: string;
          role?: UserRole;
          spesialisasi?: UserSpecialization;
          status_aktif?: boolean;
          foto?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nama?: string;
          email?: string;
          role?: UserRole;
          spesialisasi?: UserSpecialization;
          status_aktif?: boolean;
          foto?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: Task;
        Insert: {
          id?: string;
          judul: string;
          deskripsi?: string | null;
          jenis_pekerjaan: string;
          klien_proyek: string;
          prioritas: TaskPriority;
          tanggal_mulai?: string;
          deadline: string;
          status?: TaskStatus;
          spesifikasi_teknis?: TechnicalSpecs;
          link_referensi?: string | null;
          link_hasil?: string | null;
          perlu_upload_sosmed?: boolean;
          status_posting?: 'menunggu_posting' | 'sudah_diposting' | null;
          link_posting?: string | null;
          catatan_posting?: string | null;
          posted_at?: string | null;
          posted_by?: string | null;
          revision_count?: number;
          catatan_revisi?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          judul?: string;
          deskripsi?: string | null;
          jenis_pekerjaan?: string;
          klien_proyek?: string;
          prioritas?: TaskPriority;
          tanggal_mulai?: string;
          deadline?: string;
          status?: TaskStatus;
          spesifikasi_teknis?: TechnicalSpecs;
          link_referensi?: string | null;
          link_hasil?: string | null;
          perlu_upload_sosmed?: boolean;
          status_posting?: 'menunggu_posting' | 'sudah_diposting' | null;
          link_posting?: string | null;
          catatan_posting?: string | null;
          posted_at?: string | null;
          posted_by?: string | null;
          revision_count?: number;
          catatan_revisi?: string | null;
          created_by?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_assignees: {
        Row: TaskAssignee;
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          assigned_at?: string;
        };
        Relationships: [];
      };
      task_categories: {
        Row: TaskCategory;
        Insert: {
          id?: string;
          nama: string;
          tipe?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nama?: string;
          tipe?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: {
          id?: string;
          user_id: string;
          tipe: string;
          judul: string;
          pesan: string;
          task_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tipe?: string;
          judul?: string;
          pesan?: string;
          task_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      notification_logs: {
        Row: NotificationLog;
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          stage: string;
          channel: 'in_app' | 'email';
          sent_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          stage?: string;
          channel?: 'in_app' | 'email';
          sent_at?: string;
        };
        Relationships: [];
      };
      system_notification_settings: {
        Row: SystemNotificationSettings;
        Insert: {
          id?: string;
          stage_h3_enabled?: boolean;
          stage_h1_enabled?: boolean;
          stage_3h_enabled?: boolean;
          stage_overdue_enabled?: boolean;
          cc_admin_urgent?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          stage_h3_enabled?: boolean;
          stage_h1_enabled?: boolean;
          stage_3h_enabled?: boolean;
          stage_overdue_enabled?: boolean;
          cc_admin_urgent?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_notification_preferences: {
        Row: UserNotificationPreferences;
        Insert: {
          user_id: string;
          in_app_enabled?: boolean;
          email_enabled?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          in_app_enabled?: boolean;
          email_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      task_comments: {
        Row: TaskComment;
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          pesan: string;
          mentions?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          pesan?: string;
          mentions?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      task_attachments: {
        Row: TaskAttachment;
        Insert: {
          id?: string;
          task_id: string;
          uploader_id: string;
          file_name: string;
          file_url: string;
          file_size: number;
          file_type: string;
          kategori?: 'brief' | 'hasil' | 'umum';
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          uploader_id?: string;
          file_name?: string;
          file_url?: string;
          file_size?: number;
          file_type?: string;
          kategori?: 'brief' | 'hasil' | 'umum';
          created_at?: string;
        };
        Relationships: [];
      };
      task_subtasks: {
        Row: TaskSubtask;
        Insert: {
          id?: string;
          task_id: string;
          judul: string;
          is_completed?: boolean;
          urutan?: number;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          judul?: string;
          is_completed?: boolean;
          urutan?: number;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      task_time_logs: {
        Row: TaskTimeLog;
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          started_at?: string;
          ended_at?: string | null;
          duration_minutes?: number;
          is_running?: boolean;
          catatan?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          started_at?: string;
          ended_at?: string | null;
          duration_minutes?: number;
          is_running?: boolean;
          catatan?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      task_activities: {
        Row: TaskActivity;
        Insert: {
          id?: string;
          task_id: string;
          user_id: string;
          action_type: string;
          description: string;
          old_value?: string | null;
          new_value?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          user_id?: string;
          action_type?: string;
          description?: string;
          old_value?: string | null;
          new_value?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      task_templates: {
        Row: TaskTemplate;
        Insert: {
          id?: string;
          nama: string;
          deskripsi?: string | null;
          jenis_pekerjaan: string;
          spesifikasi_teknis?: TechnicalSpecs;
          default_subtasks?: string[];
          prioritas_default?: TaskPriority;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nama?: string;
          deskripsi?: string | null;
          jenis_pekerjaan?: string;
          spesifikasi_teknis?: TechnicalSpecs;
          default_subtasks?: string[];
          prioritas_default?: TaskPriority;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recurring_tasks: {
        Row: RecurringTask;
        Insert: {
          id?: string;
          judul: string;
          deskripsi?: string | null;
          jenis_pekerjaan: string;
          klien_proyek: string;
          prioritas?: TaskPriority;
          spesifikasi_teknis?: TechnicalSpecs;
          link_referensi?: string | null;
          frekuensi: RecurringFrequency;
          assignee_ids?: string[];
          default_subtasks?: string[];
          jam_deadline?: string;
          hari_dalam_minggu?: number | null;
          tanggal_dalam_bulan?: number | null;
          tanggal_mulai?: string;
          tanggal_berakhir?: string | null;
          terakhir_dibuat?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          judul?: string;
          deskripsi?: string | null;
          jenis_pekerjaan?: string;
          klien_proyek?: string;
          prioritas?: TaskPriority;
          spesifikasi_teknis?: TechnicalSpecs;
          link_referensi?: string | null;
          frekuensi?: RecurringFrequency;
          assignee_ids?: string[];
          default_subtasks?: string[];
          jam_deadline?: string;
          hari_dalam_minggu?: number | null;
          tanggal_dalam_bulan?: number | null;
          tanggal_mulai?: string;
          tanggal_berakhir?: string | null;
          terakhir_dibuat?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      user_specialization: 'Video Editor' | 'Desainer Grafis';
      task_priority: TaskPriority;
      task_status: TaskStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
