'use client';

import React, { useState } from 'react';
import type {
  SystemNotificationSettings,
  UserNotificationPreferences,
  Profile,
  TaskTemplate,
  RecurringTask,
  TaskCategory,
  TaskPriority,
  RecurringFrequency,
} from '@/types/database';
import {
  updateSystemNotificationSettings,
  updateUserNotificationPreferences,
  triggerManualReminders,
} from '@/app/actions/notifications';
import {
  createTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
  createRecurringTask,
  toggleRecurringTask,
  deleteRecurringTask,
  processRecurringTasksEngine,
} from '@/app/actions/productivity';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Settings,
  Clock,
  Bell,
  Mail,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Shield,
  Layers,
  Sparkles,
  Bookmark,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  Calendar,
  Users,
  Video,
  Palette,
  CheckSquare,
  Check,
  HardDrive,
  Cloud,
  RefreshCw,
  UploadCloud,
  Info,
  AlertTriangle,
  Monitor,
  Maximize2,
} from 'lucide-react';
import { getCloudinaryUsageAction, triggerManualCleanupAction } from '@/app/actions/cloudinary';
import type { CloudinaryUsageData, CloudinaryCleanupResult } from '@/lib/cloudinary/client';

interface AdminSettingsClientProps {
  currentProfile: Profile;
  initialSettings: SystemNotificationSettings;
  initialPreferences: UserNotificationPreferences;
  initialTemplates: TaskTemplate[];
  initialRecurringTasks: RecurringTask[];
  employees: Profile[];
  categories: TaskCategory[];
  isCloudinaryActive?: boolean;
  initialCloudinaryUsage?: CloudinaryUsageData | null;
}

export function AdminSettingsClient({
  currentProfile,
  initialSettings,
  initialPreferences,
  initialTemplates,
  initialRecurringTasks,
  employees,
  categories,
  isCloudinaryActive = false,
  initialCloudinaryUsage = null,
}: AdminSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'pengingat' | 'template' | 'recurring' | 'storage'>('pengingat');
  const [cloudinaryUsage, setCloudinaryUsage] = useState<CloudinaryUsageData | null>(initialCloudinaryUsage);
  const [isRefreshingUsage, setIsRefreshingUsage] = useState(false);
  const [isCleaningUpStorage, setIsCleaningUpStorage] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<CloudinaryCleanupResult | null>(null);
  const [confirmPurgeModalOpen, setConfirmPurgeModalOpen] = useState(false);

  // Settings & Preferences
  const [settings, setSettings] = useState<SystemNotificationSettings>(initialSettings);
  const [preferences, setPreferences] = useState<UserNotificationPreferences>(initialPreferences);
  const [maxActiveTasks, setMaxActiveTasks] = useState<number>(
    initialSettings.max_active_tasks_per_employee ?? 4
  );

  // Templates
  const [templates, setTemplates] = useState<TaskTemplate[]>(initialTemplates);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [tplNama, setTplNama] = useState('');
  const [tplDeskripsi, setTplDeskripsi] = useState('');
  const [tplJenis, setTplJenis] = useState('Video Editing');
  const [tplPrioritas, setTplPrioritas] = useState<TaskPriority>('Sedang');
  const [tplDurasi, setTplDurasi] = useState('30 detik');
  const [tplResolusi, setTplResolusi] = useState('1080x1920 (Full HD Vertical)');
  const [tplRasio, setTplRasio] = useState('9:16');
  const [tplUkuran, setTplUkuran] = useState('1080x1350 (Instagram Portrait 4:5)');
  const [tplSubtasks, setTplSubtasks] = useState<string[]>([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');

  // Recurring Tasks
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>(initialRecurringTasks);
  const [recurringModalOpen, setRecurringModalOpen] = useState(false);
  const [recJudul, setRecJudul] = useState('');
  const [recKlien, setRecKlien] = useState('');
  const [recDeskripsi, setRecDeskripsi] = useState('');
  const [recJenis, setRecJenis] = useState('Video Editing');
  const [recPrioritas, setRecPrioritas] = useState<TaskPriority>('Sedang');
  const [recFrekuensi, setRecFrekuensi] = useState<RecurringFrequency>('mingguan');
  const [recHariMinggu, setRecHariMinggu] = useState<number>(1); // 1 = Senin
  const [recTglBulan, setRecTglBulan] = useState<number>(1);
  const [recJamDeadline, setRecJamDeadline] = useState('17:00');
  const [recTglMulai, setRecTglMulai] = useState(new Date().toISOString().slice(0, 10));
  const [recTglBerakhir, setRecTglBerakhir] = useState('');
  const [recAssignees, setRecAssignees] = useState<string[]>([]);
  const [recSubtasks, setRecSubtasks] = useState<string[]>([]);
  const [newRecSubtaskInput, setNewRecSubtaskInput] = useState('');

  // Loading states
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [isTriggeringReminders, setIsTriggeringReminders] = useState(false);
  const [isTriggeringRecurring, setIsTriggeringRecurring] = useState(false);
  const [isSubmittingTemplate, setIsSubmittingTemplate] = useState(false);
  const [isSubmittingRecurring, setIsSubmittingRecurring] = useState(false);

  // Feedback banners
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Generator Result
  const [recurringRunResult, setRecurringRunResult] = useState<{
    processed: number;
    createdTasks: string[];
  } | null>(null);

  // Manual Trigger Reminder Result
  const [triggerResult, setTriggerResult] = useState<{
    evaluatedTasksCount: number;
    notificationsSent: number;
    emailsSent: number;
    skippedDuplicates: number;
    logs: string[];
  } | null>(null);

  // 1. Simpan Pengaturan Tahap Pengingat Batas Waktu
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setFeedbackSuccess(null);
    setFeedbackError(null);

    const res = await updateSystemNotificationSettings({
      stage_h3_enabled: settings.stage_h3_enabled,
      stage_h1_enabled: settings.stage_h1_enabled,
      stage_3h_enabled: settings.stage_3h_enabled,
      stage_overdue_enabled: settings.stage_overdue_enabled,
      cc_admin_urgent: settings.cc_admin_urgent,
      max_active_tasks_per_employee: maxActiveTasks,
    });

    setIsSavingSettings(false);
    if (res.success) {
      setFeedbackSuccess('Pengaturan sistem pengingat deadline berhasil disimpan.');
      setTimeout(() => setFeedbackSuccess(null), 4000);
    } else {
      setFeedbackError(res.error || 'Gagal menyimpan pengaturan.');
    }
  };

  // 2. Simpan Preferensi Channel Admin
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrefs(true);
    setFeedbackSuccess(null);
    setFeedbackError(null);

    const res = await updateUserNotificationPreferences({
      in_app_enabled: preferences.in_app_enabled,
      email_enabled: preferences.email_enabled,
    });

    setIsSavingPrefs(false);
    if (res.success) {
      setFeedbackSuccess('Preferensi channel notifikasi akun Anda berhasil disimpan.');
      setTimeout(() => setFeedbackSuccess(null), 4000);
    } else {
      setFeedbackError(res.error || 'Gagal menyimpan preferensi.');
    }
  };

  // 3. Jalankan Pengingat Manual
  const handleTriggerReminders = async () => {
    setIsTriggeringReminders(true);
    setTriggerResult(null);
    setFeedbackError(null);

    const res = await triggerManualReminders();
    setIsTriggeringReminders(false);

    if (res.success && res.result) {
      setTriggerResult(res.result);
      setFeedbackSuccess('Evaluasi pengingat deadline selesai diproses.');
    } else {
      setFeedbackError(res.error || 'Gagal menjalankan evaluasi pengingat.');
    }
  };

  // 4. Jalankan Generator Tugas Berulang Sekarang
  const handleTriggerRecurringEngine = async () => {
    setIsTriggeringRecurring(true);
    setRecurringRunResult(null);
    setFeedbackError(null);

    try {
      const res = await processRecurringTasksEngine();
      setIsTriggeringRecurring(false);
      setRecurringRunResult(res);
      setFeedbackSuccess(`Generator berhasil diproses: ${res.createdTasks.length} tugas baru dibuat hari ini.`);
    } catch (err: unknown) {
      setIsTriggeringRecurring(false);
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      setFeedbackError(msg);
    }
  };

  // 5. Cloudinary Storage Handlers
  const handleRefreshCloudinaryUsage = async () => {
    setIsRefreshingUsage(true);
    setFeedbackError(null);
    const res = await getCloudinaryUsageAction();
    setIsRefreshingUsage(false);
    if (res.success && res.data) {
      setCloudinaryUsage(res.data);
      setFeedbackSuccess('Data kuota Cloudinary berhasil diperbarui.');
      setTimeout(() => setFeedbackSuccess(null), 3000);
    } else {
      setFeedbackError(res.error || 'Gagal menyegarkan data Cloudinary.');
    }
  };

  const handleManualCleanup = async (forceAll: boolean = true) => {
    setIsCleaningUpStorage(true);
    setCleanupResult(null);
    setFeedbackError(null);
    setConfirmPurgeModalOpen(false);

    const res = await triggerManualCleanupAction({ forceAll });
    setIsCleaningUpStorage(false);
    if (res.success && res.result) {
      setCleanupResult(res.result);
      setFeedbackSuccess(
        forceAll
          ? `Hapus paksa tuntas! ${res.result.deletedCount} file lampiran (termasuk < 7 hari) berhasil dibersihkan dari Cloudinary.`
          : `Pembersihan selesai! ${res.result.deletedCount} file kedaluwarsa (> 7 hari) berhasil dihapus.`
      );
      handleRefreshCloudinaryUsage();
    } else {
      setFeedbackError(res.error || 'Gagal menjalankan pembersihan file.');
    }
  };

  // 6. Template Actions
  const openNewTemplateModal = () => {
    setEditingTemplate(null);
    setTplNama('');
    setTplDeskripsi('');
    setTplJenis('Video Editing');
    setTplPrioritas('Sedang');
    setTplDurasi('30 detik');
    setTplResolusi('1080x1920 (Full HD Vertical)');
    setTplRasio('9:16');
    setTplUkuran('1080x1350 (Instagram Portrait 4:5)');
    setTplSubtasks([]);
    setTemplateModalOpen(true);
  };

  const openEditTemplateModal = (tpl: TaskTemplate) => {
    setEditingTemplate(tpl);
    setTplNama(tpl.nama);
    setTplDeskripsi(tpl.deskripsi || '');
    setTplJenis(tpl.jenis_pekerjaan);
    setTplPrioritas(tpl.prioritas_default || 'Sedang');
    if (tpl.spesifikasi_teknis) {
      if (tpl.spesifikasi_teknis.durasi) setTplDurasi(tpl.spesifikasi_teknis.durasi);
      if (tpl.spesifikasi_teknis.resolusi) setTplResolusi(tpl.spesifikasi_teknis.resolusi);
      if (tpl.spesifikasi_teknis.rasio) setTplRasio(tpl.spesifikasi_teknis.rasio);
      if (tpl.spesifikasi_teknis.ukuran) setTplUkuran(tpl.spesifikasi_teknis.ukuran);
    }
    setTplSubtasks([]);
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplNama.trim()) return;

    setIsSubmittingTemplate(true);
    let specs: Record<string, string> = {};
    if (tplJenis.toLowerCase().includes('video')) {
      specs = { durasi: tplDurasi, resolusi: tplResolusi, rasio: tplRasio };
    } else {
      specs = { ukuran: tplUkuran };
    }

    if (editingTemplate) {
      const res = await updateTaskTemplate({
        id: editingTemplate.id,
        nama: tplNama,
        deskripsi: tplDeskripsi,
        jenis_pekerjaan: tplJenis,
        prioritas_default: tplPrioritas,
        spesifikasi_teknis: specs,
        default_subtasks: [],
      });
      setIsSubmittingTemplate(false);
      if (res.success) {
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === editingTemplate.id
              ? {
                  ...t,
                  nama: tplNama,
                  deskripsi: tplDeskripsi,
                  jenis_pekerjaan: tplJenis,
                  prioritas_default: tplPrioritas,
                  spesifikasi_teknis: specs,
                  default_subtasks: [],
                }
              : t
          )
        );
        setTemplateModalOpen(false);
        setFeedbackSuccess('Template tugas berhasil diperbarui.');
      } else {
        setFeedbackError(res.error || 'Gagal mengubah template.');
      }
    } else {
      const res = await createTaskTemplate({
        nama: tplNama,
        deskripsi: tplDeskripsi,
        jenis_pekerjaan: tplJenis,
        prioritas_default: tplPrioritas,
        spesifikasi_teknis: specs,
        default_subtasks: [],
      });
      setIsSubmittingTemplate(false);
      if (res.success && res.templateId) {
        setTemplates((prev) => [
          ...prev,
          {
            id: res.templateId!,
            nama: tplNama,
            deskripsi: tplDeskripsi,
            jenis_pekerjaan: tplJenis,
            prioritas_default: tplPrioritas,
            spesifikasi_teknis: specs,
            default_subtasks: [],
            created_by: currentProfile.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);
        setTemplateModalOpen(false);
        setFeedbackSuccess('Template tugas baru berhasil ditambahkan.');
      } else {
        setFeedbackError(res.error || 'Gagal membuat template.');
      }
    }
  };

  const handleDeleteTemplate = async (id: string, nama: string) => {
    if (!confirm(`Hapus template "${nama}"?`)) return;
    const res = await deleteTaskTemplate(id);
    if (res.success) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      setFeedbackSuccess(`Template "${nama}" telah dihapus.`);
    } else {
      setFeedbackError(res.error || 'Gagal menghapus template.');
    }
  };

  // 6. Recurring Task Actions
  const openNewRecurringModal = () => {
    setRecJudul('');
    setRecKlien('');
    setRecDeskripsi('');
    setRecJenis('Video Editing');
    setRecPrioritas('Sedang');
    setRecFrekuensi('mingguan');
    setRecHariMinggu(1);
    setRecTglBulan(1);
    setRecJamDeadline('17:00');
    setRecTglMulai(new Date().toISOString().slice(0, 10));
    setRecTglBerakhir('');
    setRecAssignees([]);
    setRecSubtasks(['Pengecekan Brief Rutin', 'Pengerjaan Awal', 'Review Internal', 'Serah Terima']);
    setRecurringModalOpen(true);
  };

  const handleSaveRecurringTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recJudul.trim() || !recKlien.trim() || !recTglMulai) return;

    setIsSubmittingRecurring(true);
    const res = await createRecurringTask({
      judul: recJudul,
      deskripsi: recDeskripsi,
      klien_proyek: recKlien,
      jenis_pekerjaan: recJenis,
      prioritas: recPrioritas,
      frekuensi: recFrekuensi,
      hari_dalam_minggu: recFrekuensi === 'mingguan' ? Number(recHariMinggu) : undefined,
      tanggal_dalam_bulan: recFrekuensi === 'bulanan' ? Number(recTglBulan) : undefined,
      jam_deadline: recJamDeadline + ':00',
      tanggal_mulai: recTglMulai,
      tanggal_berakhir: recTglBerakhir || undefined,
      assignee_ids: recAssignees,
      default_subtasks: recSubtasks,
    });

    setIsSubmittingRecurring(false);
    if (res.success && res.recurringId) {
      setRecurringTasks((prev) => [
        {
          id: res.recurringId!,
          judul: recJudul,
          deskripsi: recDeskripsi,
          klien_proyek: recKlien,
          jenis_pekerjaan: recJenis,
          prioritas: recPrioritas,
          spesifikasi_teknis: {},
          link_referensi: null,
          frekuensi: recFrekuensi,
          assignee_ids: recAssignees,
          default_subtasks: recSubtasks,
          jam_deadline: recJamDeadline + ':00',
          hari_dalam_minggu: recFrekuensi === 'mingguan' ? Number(recHariMinggu) : null,
          tanggal_dalam_bulan: recFrekuensi === 'bulanan' ? Number(recTglBulan) : null,
          tanggal_mulai: recTglMulai,
          tanggal_berakhir: recTglBerakhir || null,
          terakhir_dibuat: null,
          is_active: true,
          created_by: currentProfile.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setRecurringModalOpen(false);
      setFeedbackSuccess('Jadwal tugas berulang berhasil dibuat.');
    } else {
      setFeedbackError(res.error || 'Gagal menyimpan tugas berulang.');
    }
  };

  const handleToggleRecurring = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    const res = await toggleRecurringTask(id, nextStatus);
    if (res.success) {
      setRecurringTasks((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_active: nextStatus } : r))
      );
      setFeedbackSuccess(`Status jadwal berhasil ${nextStatus ? 'diaktifkan' : 'dinonaktifkan'}.`);
    } else {
      setFeedbackError(res.error || 'Gagal mengubah status jadwal.');
    }
  };

  const handleDeleteRecurring = async (id: string, judul: string) => {
    if (!confirm(`Hapus jadwal tugas berulang "${judul}"?`)) return;
    const res = await deleteRecurringTask(id);
    if (res.success) {
      setRecurringTasks((prev) => prev.filter((r) => r.id !== id));
      setFeedbackSuccess(`Jadwal "${judul}" telah dihapus.`);
    } else {
      setFeedbackError(res.error || 'Gagal menghapus jadwal.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Pengaturan Sistem &amp; Produktivitas
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Kelola parameter operasional, tahapan pengingat otomatis, template tugas instan, dan jadwal pembuatan tugas berulang.
        </p>
      </div>

      {/* Feedback alerts */}
      {feedbackSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-in fade-in-50">
          <span>{feedbackSuccess}</span>
        </div>
      )}

      {feedbackError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium animate-in fade-in-50">
          <span>{feedbackError}</span>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pengingat')}
          className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'pengingat'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Pengingat Deadline
        </button>

        <button
          onClick={() => setActiveTab('template')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'template'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Template Tugas
          <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
            activeTab === 'template' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {templates.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('recurring')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'recurring'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Tugas Berulang (Scheduler)
          <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
            activeTab === 'recurring' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {recurringTasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
            activeTab === 'storage'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Penyimpanan Media (Cloudinary)
          <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
            activeTab === 'storage' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            25 GB
          </span>
        </button>
      </div>

      {/* TAB 1: PENGINGAT DEADLINE */}
      {activeTab === 'pengingat' && (
        <div className="space-y-6 animate-in fade-in-50">

          {/* Card: Tahap Pengingat Batas Waktu */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-base font-bold text-slate-900">
                  Tahap Pengingat Batas Waktu Otomatis
                </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Jadwal tahapan otomatis pengiriman notifikasi pengingat sebelum dan sesudah deadline pengerjaan.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSaveSettings}>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* H-3 */}
                  <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer bg-white dark:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={settings.stage_h3_enabled}
                      onChange={(e) =>
                        setSettings({ ...settings, stage_h3_enabled: e.target.checked })
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>H-3 Hari Sebelum Deadline</span>
                        <Badge variant="outline" className="text-[10px] text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60">
                          Info Awal
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Memberikan pengingat dini kepada penanggung jawab bahwa batas penyerahan tugas tinggal 3 hari.
                      </p>
                    </div>
                  </label>

                  {/* H-1 */}
                  <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer bg-white dark:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={settings.stage_h1_enabled}
                      onChange={(e) =>
                        setSettings({ ...settings, stage_h1_enabled: e.target.checked })
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>H-1 Hari Sebelum Deadline</span>
                        <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60">
                          Peringatan
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Peringatan penting agar tim memastikan materi pengerjaan siap masuk proses review.
                      </p>
                    </div>
                  </label>

                  {/* 3 Jam */}
                  <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer bg-white dark:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={settings.stage_3h_enabled}
                      onChange={(e) =>
                        setSettings({ ...settings, stage_3h_enabled: e.target.checked })
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>3 Jam Sebelum Deadline</span>
                        <Badge variant="outline" className="text-[10px] text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60">
                          Mendesak
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Pengingat darurat ketika sisa waktu hari pengerjaan kurang dari 3 jam (WIB).
                      </p>
                    </div>
                  </label>

                  {/* Overdue */}
                  <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer bg-white dark:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={settings.stage_overdue_enabled}
                      onChange={(e) =>
                        setSettings({ ...settings, stage_overdue_enabled: e.target.checked })
                      }
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>Lewat Deadline (Terlambat)</span>
                        <Badge variant="outline" className="text-[10px] text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60">
                          Eskalasi
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Kirim seketika saat deadline terlewati, dan diulang setiap 24 jam sampai tugas selesai.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.cc_admin_urgent}
                      onChange={(e) =>
                        setSettings({ ...settings, cc_admin_urgent: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-indigo-600" />
                        Tembusan ke Seluruh Administrator untuk Prioritas Tinggi & Urgent
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Admin otomatis menerima notifikasi tahap 3 Jam dan Terlambat pada tugas prioritas tinggi.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={isSavingSettings}
                    className="gap-2 px-6 shadow-sm font-semibold"
                  >
                    {isSavingSettings ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan Pengaturan Sistem'
                    )}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>

          {/* Card: Preferensi Channel Akun Admin */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Preferensi Channel Notifikasi Akun Anda
                </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Pilih media penerimaan pemberitahuan untuk profil {currentProfile.nama} ({currentProfile.email}).
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSavePreferences}>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer bg-white dark:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={preferences.in_app_enabled}
                      onChange={(e) =>
                        setPreferences({ ...preferences, in_app_enabled: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Bell className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        Notifikasi In-App (Lonceng Header)
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Badge counter real-time dan popup dropdown di dalam dashboard.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer bg-white dark:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={preferences.email_enabled}
                      onChange={(e) =>
                        setPreferences({ ...preferences, email_enabled: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        Notifikasi Email
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Kirim salinan pengingat dan update tugas ke email {currentProfile.email}.
                      </p>
                    </div>
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      setFeedbackSuccess(null);
                      setFeedbackError(null);
                      try {
                        const { triggerNativeNotification } = await import('@/lib/notifications/device-notifications');
                        const res = await triggerNativeNotification({
                          title: 'Uji Notifikasi Perangkat (Admin)',
                          body: 'Push notifikasi aktif! Notifikasi tugas dan sistem akan muncul di status bar HP.',
                        });
                        if (res && !res.success) {
                          const errMsg = res.error || 'Gagal memicu notifikasi. Periksa izin di Pengaturan HP.';
                          setFeedbackError(errMsg);
                          alert('Gagal: ' + errMsg);
                        } else {
                          const successMsg = 'Tes notifikasi terkirim! Periksa status bar / layar atas HP Anda.';
                          setFeedbackSuccess(successMsg);
                          alert(successMsg);
                          setTimeout(() => setFeedbackSuccess(null), 4000);
                        }
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : String(err);
                        setFeedbackError(msg);
                        alert('Error: ' + msg);
                      }
                    }}
                    className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
                  >
                    Uji Push Notifikasi
                  </Button>

                  <Button
                    type="submit"
                    disabled={isSavingPrefs}
                    variant="outline"
                    className="gap-2 px-6 font-semibold"
                  >
                    {isSavingPrefs ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      'Simpan Preferensi Akun'
                    )}
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>

          {/* Card: Testing / Force Run Scheduler Pengingat */}
          <Card className="border-slate-200 shadow-xs bg-slate-50/50">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-slate-900">
                  Uji Evaluasi Pengingat Manual (Testing / Force Run)
                </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Jalankan engine evaluasi deadline saat ini juga tanpa menunggu jadwal cron otomatis per 15 menit.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="text-xs text-slate-600">
                  Engine akan memeriksa seluruh tugas aktif terhadap interval deadline saat ini (WIB), mencatat ke <code>notification_logs</code>, dan mencegah pengiriman ganda.
                </div>
                <Button
                  onClick={handleTriggerReminders}
                  disabled={isTriggeringReminders}
                  className="gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                >
                  {isTriggeringReminders ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mengevaluasi...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 fill-white" />
                      Jalankan Evaluasi Pengingat Sekarang
                    </>
                  )}
                </Button>
              </div>

              {triggerResult && (
                <div className="mt-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                    <span>Hasil Evaluasi Engine Pengingat:</span>
                    <Badge variant="outline">
                      {triggerResult.evaluatedTasksCount} tugas dievaluasi
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 py-2 text-center">
                    <div className="p-2 rounded bg-indigo-50 text-indigo-900">
                      <div className="text-lg font-bold">{triggerResult.notificationsSent}</div>
                      <div className="text-[10px] text-indigo-700">Notifikasi In-App</div>
                    </div>
                    <div className="p-2 rounded bg-emerald-50 text-emerald-900">
                      <div className="text-lg font-bold">{triggerResult.emailsSent}</div>
                      <div className="text-[10px] text-emerald-700">Email Terkirim</div>
                    </div>
                    <div className="p-2 rounded bg-slate-100 text-slate-700">
                      <div className="text-lg font-bold">{triggerResult.skippedDuplicates}</div>
                      <div className="text-[10px] text-slate-500">Dicegah (Duplikat)</div>
                    </div>
                  </div>
                  {triggerResult.logs.length > 0 && (
                    <div className="max-h-36 overflow-y-auto font-mono text-[11px] p-2 bg-slate-900 text-emerald-400 rounded-lg space-y-1">
                      {triggerResult.logs.map((log, i) => (
                        <div key={i}>{log}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: TEMPLATE TUGAS */}
      {activeTab === 'template' && (
        <div className="space-y-6 animate-in fade-in-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Template Tugas Tim Kreatif
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Standarisasi pembuatan tugas cepat lengkap dengan spesifikasi teknis dan tahapan subtask checklist.
              </p>
            </div>
            <Button
              onClick={openNewTemplateModal}
              className="font-semibold shadow-xs"
            >
              Tambah Template Baru
            </Button>
          </div>

          {templates.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
              <Bookmark className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700">Belum Ada Template Tugas</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Buat template pertama Anda seperti "Reels Instagram 30 Detik" atau "E-Flyer Promo Feed" untuk mempercepat penugasan.
              </p>
              <Button onClick={openNewTemplateModal} className="mt-4 text-xs font-semibold">
                Buat Template Sekarang
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tpl) => {
                const isVideo = tpl.jenis_pekerjaan.toLowerCase().includes('video');

                return (
                  <Card key={tpl.id} className="border-slate-200 shadow-xs hover:border-indigo-300 transition-all flex flex-col justify-between">
                    <CardHeader className="pb-3 border-b border-slate-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border-indigo-200">
                              {tpl.jenis_pekerjaan}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              Prioritas: {tpl.prioritas_default}
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-bold text-slate-900 pt-1">
                            {tpl.nama}
                          </CardTitle>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openEditTemplateModal(tpl)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="Edit template"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(tpl.id, tpl.nama)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {tpl.deskripsi && (
                        <CardDescription className="text-xs text-slate-500 line-clamp-2 pt-1">
                          {tpl.deskripsi}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="p-4 space-y-3 text-xs">
                      {/* Specs pills */}
                      {tpl.spesifikasi_teknis && Object.keys(tpl.spesifikasi_teknis).length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {isVideo ? (
                            <>
                              {tpl.spesifikasi_teknis.durasi && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  <span>{tpl.spesifikasi_teknis.durasi}</span>
                                </span>
                              )}
                              {tpl.spesifikasi_teknis.rasio && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                                  <Maximize2 className="h-3 w-3 shrink-0" />
                                  <span>{tpl.spesifikasi_teknis.rasio}</span>
                                </span>
                              )}
                              {tpl.spesifikasi_teknis.resolusi && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                                  <Monitor className="h-3 w-3 shrink-0" />
                                  <span>{tpl.spesifikasi_teknis.resolusi}</span>
                                </span>
                              )}
                            </>
                          ) : (
                            tpl.spesifikasi_teknis.ukuran && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                                <Palette className="h-3 w-3 shrink-0" />
                                <span>{tpl.spesifikasi_teknis.ukuran}</span>
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TUGAS BERULANG (SCHEDULER) */}
      {activeTab === 'recurring' && (
        <div className="space-y-6 animate-in fade-in-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Jadwal Tugas Berulang Otomatis
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tugas harian, mingguan, atau bulanan yang otomatis di-generate oleh scheduler sistem tepat pada jadwalnya.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerRecurringEngine}
                disabled={isTriggeringRecurring}
                className="gap-1.5 text-xs font-semibold text-slate-700 border-slate-300"
              >
                {isTriggeringRecurring ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Menjalankan Generator...
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-slate-700" />
                    Jalankan Generator Hari Ini
                  </>
                )}
              </Button>
              <Button
                onClick={openNewRecurringModal}
                size="sm"
                className="text-xs font-semibold shadow-xs"
              >
                Tambah Jadwal Baru
              </Button>
            </div>
          </div>

          {recurringRunResult && (
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 space-y-1">
              <div className="font-bold">
                Eksekusi Generator Sukses
              </div>
              <p>
                Sistem memeriksa jadwal aktif dan membuat <strong>{recurringRunResult.createdTasks.length}</strong> tugas baru:
              </p>
              {recurringRunResult.createdTasks.length > 0 ? (
                <ul className="list-disc list-inside font-semibold pl-1">
                  {recurringRunResult.createdTasks.map((t, idx) => (
                    <li key={idx}>{t}</li>
                  ))}
                </ul>
              ) : (
                <p className="italic text-indigo-700">
                  Tidak ada tugas baru yang jatuh tempo hari ini atau seluruh tugas berulang hari ini sudah pernah dibuat sebelumnya.
                </p>
              )}
            </div>
          )}

          {recurringTasks.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
              <RotateCcw className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700">Belum Ada Jadwal Tugas Berulang</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Buat jadwal rutin seperti "Konten Reels Mingguan" atau "Laporan Desain Bulanan" agar otomatis diterbitkan ke tim.
              </p>
              <Button onClick={openNewRecurringModal} className="mt-4 text-xs font-semibold">
                Buat Jadwal Pertama
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recurringTasks.map((item) => {
                const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                let scheduleLabel = '';
                if (item.frekuensi === 'harian') scheduleLabel = 'Setiap Hari';
                else if (item.frekuensi === 'mingguan')
                  scheduleLabel = `Setiap ${dayNames[item.hari_dalam_minggu ?? 1]}`;
                else if (item.frekuensi === 'bulanan')
                  scheduleLabel = `Setiap Tanggal ${item.tanggal_dalam_bulan}`;

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all ${
                      item.is_active
                        ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 opacity-60'
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            item.frekuensi === 'harian'
                              ? 'text-blue-700 bg-blue-50 border-blue-200'
                              : item.frekuensi === 'mingguan'
                              ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                              : 'text-purple-700 bg-purple-50 border-purple-200'
                          }`}
                        >
                          {scheduleLabel}
                        </Badge>
                        <span className="text-xs font-semibold text-slate-500">
                          Deadline: {item.jam_deadline.slice(0, 5)} WIB
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {item.klien_proyek}
                        </Badge>
                      </div>

                      <div className="font-bold text-slate-900 text-sm truncate">
                        {item.judul}
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span>Jenis: <strong>{item.jenis_pekerjaan}</strong></span>
                        <span>•</span>
                        <span>
                          Terakhir dibuat: {item.terakhir_dibuat ? item.terakhir_dibuat : 'Belum pernah'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      {/* Active toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleRecurring(item.id, item.is_active)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          item.is_active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                      >
                        {item.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRecurring(item.id, item.judul)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus jadwal"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PENYIMPANAN MEDIA (CLOUDINARY) */}
      {activeTab === 'storage' && (
        <div className="space-y-6 animate-in fade-in-50">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Kapasitas &amp; Penggunaan Cloudinary CDN
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Monitoring kuota penyimpanan aset lampiran tugas dan pengelolaan retensi pembersihan otomatis 7 hari.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshCloudinaryUsage}
                disabled={isRefreshingUsage}
                className="gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshingUsage ? 'animate-spin' : ''}`} />
                {isRefreshingUsage ? 'Memperbarui...' : 'Segarkan Kuota'}
              </Button>

              <Button
                size="sm"
                variant="destructive"
                onClick={() => setConfirmPurgeModalOpen(true)}
                disabled={isCleaningUpStorage}
                className="gap-1.5 text-xs font-semibold shadow-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isCleaningUpStorage ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Membersihkan...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Hapus Paksa Semua File (&lt; &amp; &gt; 7 Hari)
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Card 1: Gauge & Status Kuota */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Status Kuota Penyimpanan Media
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="success" className="text-xs px-2.5 py-0.5 font-semibold">
                    Terhubung &amp; Aktif
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono">
                    {cloudinaryUsage?.plan || 'Free Plan (25 GB)'}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Progress Bar Kuota */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Penggunaan Kapasitas Penyimpanan:
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                    {cloudinaryUsage
                      ? `${(cloudinaryUsage.storageUsedBytes / (1024 * 1024)).toFixed(2)} MB / ${(
                          cloudinaryUsage.storageLimitBytes /
                          (1024 * 1024 * 1024)
                        ).toFixed(0)} GB (${cloudinaryUsage.creditsPercent}%)`
                      : '0 MB / 25 GB (0%)'}
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(
                        cloudinaryUsage ? cloudinaryUsage.creditsPercent : 0,
                        1
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Kapasitas gratis Cloudinary sebesar 25 Kredit (setara 25 GB penyimpanan atau bandwidth) dialokasikan untuk seluruh aset kreatif tim.
                </p>
              </div>

              {/* 4 Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Storage Terpakai</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {cloudinaryUsage
                      ? `${(cloudinaryUsage.storageUsedBytes / (1024 * 1024)).toFixed(2)} MB`
                      : '0.00 MB'}
                  </div>
                  <span className="text-[11px] text-slate-400">Total file aktif tersimpan</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total File Media</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {cloudinaryUsage ? `${cloudinaryUsage.totalFiles} File` : '0 File'}
                  </div>
                  <span className="text-[11px] text-slate-400">Gambar, video &amp; lampiran raw</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Bandwidth Terpakai</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {cloudinaryUsage
                      ? `${(cloudinaryUsage.bandwidthUsedBytes / (1024 * 1024)).toFixed(2)} MB`
                      : '0.00 MB'}
                  </div>
                  <span className="text-[11px] text-slate-400">Traffic pengunduhan bulan ini</span>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Kebijakan Retensi</span>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    7 Hari
                  </div>
                  <span className="text-[11px] text-slate-400">Auto-delete otomatis aktif</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Auto-Delete 7 Hari & Scheduler Info */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Otomatisasi Pembersihan File Kedaluwarsa (7 Hari)
                </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Mekanisme penghapusan aset otomatis untuk memastikan kuota Cloudinary Anda tidak penuh.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  Bagaimana Auto-Delete 7 Hari Bekerja?
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400 pt-1">
                  <li>Setiap kali staf atau admin mengunggah file di <strong>Buat Tugas</strong>, file diberi tag khusus <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">auto-expire-7d</code>.</li>
                  <li>Scheduler sistem (<code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">/api/cron/cleanup-attachments</code>) otomatis mengevaluasi seluruh file di folder lampiran setiap malam pukul <strong>02.00 WIB</strong>.</li>
                  <li>Semua file yang dibuat lebih dari 7 hari yang lalu (<code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">created_at &lt; 7d</code>) langsung dihapus permanen dari Cloudinary CDN.</li>
                  <li>Anda juga dapat memicu pembersihan secara langsung kapan saja dengan tombol <em>&quot;Bersihkan File &gt; 7 Hari&quot;</em> di pojok kanan atas.</li>
                </ul>
              </div>

              {/* Log Hasil Pembersihan Jika Ada */}
              {cleanupResult && (
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2 animate-in fade-in-50 text-xs">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300">
                    Laporan Pembersihan Terakhir ({cleanupResult.deletedCount} File Dihapus)
                  </div>
                  <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900 font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-1 max-h-36 overflow-y-auto">
                    {cleanupResult.logs.map((log, idx) => (
                      <div key={idx}>{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT TEMPLATE TUGAS */}
      <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
        <DialogClose onClose={() => setTemplateModalOpen(false)} />
        <DialogHeader>
          <DialogTitle>
            {editingTemplate ? 'Edit Template Tugas' : 'Tambah Template Tugas Baru'}
          </DialogTitle>
          <DialogDescription>
            Konfigurasikan spesifikasi teknis dan acuan pengerjaan untuk template ini.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveTemplate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tpl-nama">Nama Template <span className="text-rose-500">*</span></Label>
            <Input
              id="tpl-nama"
              required
              placeholder="Contoh: Reels Instagram 30 Detik Promo"
              value={tplNama}
              onChange={(e) => setTplNama(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-jenis">Jenis Pekerjaan</Label>
              <select
                id="tpl-jenis"
                value={tplJenis}
                onChange={(e) => setTplJenis(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Video Editing">Video Editing</option>
                <option value="Desain E-Flyer">Desain E-Flyer</option>
                {categories
                  .filter((c) => c.nama !== 'Video Editing' && c.nama !== 'Desain E-Flyer')
                  .map((c) => (
                    <option key={c.id} value={c.nama}>
                      {c.nama}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-prioritas">Prioritas Default</Label>
              <select
                id="tpl-prioritas"
                value={tplPrioritas}
                onChange={(e) => setTplPrioritas(e.target.value as TaskPriority)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Rendah">Rendah</option>
                <option value="Sedang">Sedang</option>
                <option value="Tinggi">Tinggi</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tpl-deskripsi">Deskripsi / Brief Acuan</Label>
            <textarea
              id="tpl-deskripsi"
              rows={3}
              placeholder="Jelaskan standar pengerjaan, format, atau instruksi umum..."
              value={tplDeskripsi}
              onChange={(e) => setTplDeskripsi(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTemplateModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmittingTemplate}>
              {isSubmittingTemplate ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Template'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* MODAL: TAMBAH JADWAL TUGAS BERULANG */}
      <Dialog open={recurringModalOpen} onOpenChange={setRecurringModalOpen}>
        <DialogClose onClose={() => setRecurringModalOpen(false)} />
        <DialogHeader>
          <DialogTitle>Tambah Jadwal Tugas Berulang</DialogTitle>
          <DialogDescription>
            Tugas akan otomatis dibuat oleh sistem tepat pada frekuensi yang Anda jadwalkan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSaveRecurringTask} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rec-judul">Judul Tugas Rutin <span className="text-rose-500">*</span></Label>
              <Input
                id="rec-judul"
                required
                placeholder="Contoh: Produksi Video Reels Mingguan"
                value={recJudul}
                onChange={(e) => setRecJudul(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-klien">Klien / Proyek <span className="text-rose-500">*</span></Label>
              <Input
                id="rec-klien"
                required
                placeholder="Contoh: Internal Marketing / Klien A"
                value={recKlien}
                onChange={(e) => setRecKlien(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rec-frekuensi">Frekuensi Pengulangan</Label>
              <select
                id="rec-frekuensi"
                value={recFrekuensi}
                onChange={(e) => setRecFrekuensi(e.target.value as RecurringFrequency)}
                className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="harian">Harian (Setiap Hari)</option>
                <option value="mingguan">Mingguan (Hari Tertentu)</option>
                <option value="bulanan">Bulanan (Tanggal Tertentu)</option>
              </select>
            </div>

            {recFrekuensi === 'mingguan' && (
              <div className="space-y-1.5">
                <Label htmlFor="rec-hari">Pilih Hari</Label>
                <select
                  id="rec-hari"
                  value={recHariMinggu}
                  onChange={(e) => setRecHariMinggu(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={1}>Senin</option>
                  <option value={2}>Selasa</option>
                  <option value={3}>Rabu</option>
                  <option value={4}>Kamis</option>
                  <option value={5}>Jumat</option>
                  <option value={6}>Sabtu</option>
                  <option value={0}>Minggu</option>
                </select>
              </div>
            )}

            {recFrekuensi === 'bulanan' && (
              <div className="space-y-1.5">
                <Label htmlFor="rec-tgl">Pilih Tanggal</Label>
                <select
                  id="rec-tgl"
                  value={recTglBulan}
                  onChange={(e) => setRecTglBulan(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Tanggal {d}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="rec-jam">Jam Deadline (WIB)</Label>
              <Input
                id="rec-jam"
                type="time"
                value={recJamDeadline}
                onChange={(e) => setRecJamDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="rec-tgl-mulai">Mulai Berlaku Tanggal</Label>
              <Input
                id="rec-tgl-mulai"
                type="date"
                required
                value={recTglMulai}
                onChange={(e) => setRecTglMulai(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rec-tgl-akhir">Berakhir Tanggal (Opsional)</Label>
              <Input
                id="rec-tgl-akhir"
                type="date"
                value={recTglBerakhir}
                onChange={(e) => setRecTglBerakhir(e.target.value)}
              />
            </div>
          </div>

          {/* Assignees selection */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <Label>Penugasan Otomatis Ke Staf:</Label>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
              {employees.map((emp) => {
                const isSelected = recAssignees.includes(emp.id);
                return (
                  <div
                    key={emp.id}
                    onClick={() =>
                      setRecAssignees((prev) =>
                        prev.includes(emp.id)
                          ? prev.filter((id) => id !== emp.id)
                          : [...prev, emp.id]
                      )
                    }
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-xs ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <Avatar src={emp.foto} fallback={emp.nama} size="sm" />
                    <span className="truncate">{emp.nama}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRecurringModalOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmittingRecurring}>
              {isSubmittingRecurring ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Jadwal'
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* DIALOG KONFIRMASI HAPUS PAKSA SEMUA FILE CLOUDINARY */}
      <Dialog open={confirmPurgeModalOpen} onOpenChange={setConfirmPurgeModalOpen}>
        <DialogClose onClose={() => setConfirmPurgeModalOpen(false)} />
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-rose-600 dark:text-rose-400">
              Hapus Paksa Seluruh File di Cloudinary?
            </DialogTitle>
          </div>
          <DialogDescription as="div" className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
            <p>
              Sistem otomatis telah memiliki scheduler harian untuk file &gt; 7 hari. Dengan tombol ini, Anda akan <strong>menghapus paksa seluruh file lampiran</strong> di folder Cloudinary (baik yang baru diunggah &lt; 7 hari maupun file lama) untuk mengosongkan kembali kuota penyimpanan Anda secara tuntas.
            </p>
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Peringatan: File yang dihapus dari Cloudinary tidak akan dapat dipulihkan kembali.</span>
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4 gap-2 flex-col sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmPurgeModalOpen(false)}
            disabled={isCleaningUpStorage}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => handleManualCleanup(true)}
            disabled={isCleaningUpStorage}
            className="gap-1.5 font-bold bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isCleaningUpStorage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Membersihkan...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Ya, Hapus Paksa Semua File
              </>
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
