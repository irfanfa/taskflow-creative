'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  TaskWithAssignees,
  Profile,
  TaskPriority,
  TaskCategory,
  TaskStatus,
  TaskSubtask,
  TaskActivity,
} from '@/types/database';
import { updateTaskStatus, softDeleteTask, updateTask } from '@/app/actions/tasks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerPopover } from '@/components/ui/date-picker-popover';
import { TimePickerPopover } from '@/components/ui/time-picker-popover';
import { StatusBadge } from '@/components/tasks/status-badge';
import { PriorityBadge } from '@/components/tasks/priority-badge';
import { DeadlineIndicator } from '@/components/tasks/deadline-indicator';
import { NarasumberUploader } from '@/components/media/narasumber-uploader';
import { NarasumberDisplay } from '@/components/media/narasumber-display';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  Video,
  Palette,
  Users,
  Loader2,
  RotateCcw,
  Edit3,
  Share2,
} from 'lucide-react';

// Tahap 5 Collaboration Components
import { TaskReviewModal } from '@/components/collaboration/task-review-modal';
import { TaskSubtasks } from '@/components/collaboration/task-subtasks';
import { TaskActivityTimeline } from '@/components/collaboration/task-activity-timeline';
import { useTaskRealtime } from '@/hooks/use-task-realtime';

interface TaskDetailClientProps {
  task: TaskWithAssignees;
  employees: Profile[];
  categories: TaskCategory[];
  currentProfile: Profile;
  initialSubtasks: TaskSubtask[];
  initialActivities: TaskActivity[];
}

export function TaskDetailClient({
  task: initialTask,
  employees,
  categories,
  currentProfile,
  initialSubtasks,
  initialActivities,
}: TaskDetailClientProps) {
  const router = useRouter();
  const [task, setTask] = useState<TaskWithAssignees>(initialTask);
  const [activities, setActivities] = useState<TaskActivity[]>(initialActivities);

  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  // Realtime Live-Sync: sinkronisasi otomatis saat ada perubahan tugas dari pegawai / mobile
  useTaskRealtime({
    taskId: task.id,
    onUpdate: (updatedFields) => {
      setTask((prev) => ({
        ...prev,
        ...updatedFields,
      }));
    },
  });

  // Status update state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feedback states
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isVideo, setIsVideo] = useState(task.jenis_pekerjaan.toLowerCase().includes('video'));

  // Edit Task States (Khusus status Belum Dimulai)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editJudul, setEditJudul] = useState(task.judul);
  const [editJenis, setEditJenis] = useState(task.jenis_pekerjaan);
  const [editPrioritas, setEditPrioritas] = useState<TaskPriority>(task.prioritas);
  const initialDate = task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : '';
  const initialTime = task.deadline
    ? new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Jakarta',
      })
        .format(new Date(task.deadline))
        .replace('.', ':')
    : '17:00';
  const [editDate, setEditDate] = useState(initialDate);
  const [editTime, setEditTime] = useState(initialTime);
  const [editDeskripsi, setEditDeskripsi] = useState(task.deskripsi || '');
  const [editLinkRef, setEditLinkRef] = useState(task.link_referensi || '');
  const [editPerluUploadSosmed, setEditPerluUploadSosmed] = useState(task.perlu_upload_sosmed || false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!editJudul.trim()) {
      setEditError('Judul tugas wajib diisi.');
      return;
    }
    if (!editDate) {
      setEditError('Tanggal deadline wajib ditentukan.');
      return;
    }

    setIsSavingEdit(true);

    try {
      const combinedDeadline = `${editDate}T${editTime || '17:00'}:00+07:00`;
      const res = await updateTask({
        id: task.id,
        judul: editJudul.trim(),
        deskripsi: editDeskripsi.trim() || undefined,
        jenis_pekerjaan: editJenis,
        prioritas: editPrioritas,
        deadline: combinedDeadline,
        link_referensi: editLinkRef.trim() || undefined,
        perlu_upload_sosmed: editPerluUploadSosmed,
      });

      if (!res.success) {
        setEditError(res.error || 'Gagal menyimpan perubahan.');
        setIsSavingEdit(false);
        return;
      }

      setTask((prev) => ({
        ...prev,
        judul: editJudul.trim(),
        deskripsi: editDeskripsi.trim() || null,
        jenis_pekerjaan: editJenis,
        prioritas: editPrioritas,
        deadline: combinedDeadline,
        link_referensi: editLinkRef.trim() || null,
        perlu_upload_sosmed: editPerluUploadSosmed,
      }));
      setIsVideo(editJenis.toLowerCase().includes('video'));

      const changesList: string[] = [];
      if (task.judul !== editJudul.trim()) changesList.push(`Judul: "${task.judul}" -> "${editJudul.trim()}"`);
      if (task.jenis_pekerjaan !== editJenis) changesList.push(`Jenis: "${task.jenis_pekerjaan}" -> "${editJenis}"`);
      if (task.prioritas !== editPrioritas) changesList.push(`Prioritas: "${task.prioritas}" -> "${editPrioritas}"`);
      if (task.deadline !== combinedDeadline) changesList.push('Deadline diperbarui');

      const descText = changesList.length > 0
        ? `Memperbarui rincian tugas: ${changesList.join('; ')}`
        : 'Memperbarui rincian tugas';

      const localActivity: TaskActivity = {
        id: `temp-${Date.now()}`,
        task_id: task.id,
        user_id: currentProfile.id,
        action_type: 'task_updated',
        description: descText,
        old_value: null,
        new_value: null,
        created_at: new Date().toISOString(),
        user: currentProfile,
      };

      setActivities((prev) => [localActivity, ...prev]);

      setIsEditDialogOpen(false);
      setActionSuccess('Rincian tugas berhasil diperbarui dan dicatat ke log aktivitas.');
      setTimeout(() => setActionSuccess(null), 4000);
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    setIsUpdatingStatus(true);
    setActionError(null);

    const res = await updateTaskStatus({
      id: task.id,
      status: newStatus,
    });
    setIsUpdatingStatus(false);

    if (res.success) {
      setTask((prev) => ({ ...prev, status: newStatus }));
      setActionSuccess(`Status tugas berhasil diubah menjadi "${newStatus}"!`);
      setTimeout(() => setActionSuccess(null), 4000);
      router.refresh();
    } else {
      setActionError(res.error || 'Gagal mengubah status tugas.');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const res = await softDeleteTask(task.id);
    setIsDeleting(false);

    if (res.success) {
      router.push('/admin/tugas');
      router.refresh();
    } else {
      setActionError(res.error || 'Gagal menghapus tugas.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Back and Top Navigation */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-slate-600 hover:text-slate-900">
          <Link href="/admin/tugas">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Daftar Tugas
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            className="text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            Hapus Tugas
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium animate-in fade-in-50">
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium animate-in fade-in-50">
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Task Header Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-800">
              {task.jenis_pekerjaan}
            </span>
            {task.perlu_upload_sosmed && (
              <span className="font-semibold text-xs text-indigo-700 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                Posting Sosmed
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(task.status === 'Belum Dimulai' || task.status === 'Dalam Antrean') && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditJudul(task.judul);
                  setEditJenis(task.jenis_pekerjaan);
                  setEditPrioritas(task.prioritas);
                  setEditDeskripsi(task.deskripsi || '');
                  setEditLinkRef(task.link_referensi || '');
                  setEditPerluUploadSosmed(task.perlu_upload_sosmed || false);
                  setEditError(null);
                  setIsEditDialogOpen(true);
                }}
                className="h-7 px-2.5 text-xs font-semibold border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/80 shadow-xs"
              >
                <span>Edit Tugas</span>
              </Button>
            )}
            <PriorityBadge prioritas={task.prioritas} />
            <StatusBadge status={task.status} />
            {task.revision_count !== undefined && task.revision_count > 0 && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Revisi #{task.revision_count}
              </span>
            )}
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {task.judul}
        </h1>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span>
              Mulai:{' '}
              {new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'Asia/Jakarta',
              }).format(new Date(task.tanggal_mulai))}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">&bull;</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">Deadline:</span>
            <DeadlineIndicator deadline={task.deadline} isCompleted={task.status === 'Selesai'} />
          </div>
        </div>
      </div>

      {/* TAHAP 5: Alur Review Admin (Setujui atau Minta Revisi dengan catatan) */}
      <TaskReviewModal
        task={task}
        onSuccess={(newStatus) => {
          if (newStatus) {
            setTask((prev) => ({
              ...prev,
              status: newStatus,
              revision_count: newStatus === 'Revisi' ? (prev.revision_count || 0) + 1 : prev.revision_count,
            }));
          }
          setActionSuccess('Status review berhasil diperbarui.');
          setTimeout(() => setActionSuccess(null), 4000);
          router.refresh();
        }}
      />

      {/* Grid Layout: Detail Pengerjaan & Admin Action Controller */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Brief, Spesifikasi, Checklist, Hasil & Lampiran, Diskusi, Aktivitas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brief Card */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                Brief & Penjelasan Tugas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {task.deskripsi || 'Tidak ada catatan brief tambahan.'}
              </p>

              <NarasumberDisplay linkReferensi={task.link_referensi} />
            </CardContent>
          </Card>

          {/* Spesifikasi Teknis Card (Hanya jika memiliki data spesifikasi) */}
          {task.spesifikasi_teknis && Object.keys(task.spesifikasi_teknis).length > 0 && (
            <Card className="border-slate-200 shadow-xs">
              <CardHeader className="border-b border-slate-100 pb-3">
                <CardTitle className="text-base font-bold text-slate-900">
                  Spesifikasi Teknis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  {Object.entries(task.spesifikasi_teknis || {}).map(([key, value]) => (
                    <div key={key} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                        {key.replace('_', ' ')}
                      </span>
                      <span className="font-bold text-slate-800 text-sm">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subtask / Checklist dalam Tugas (Hanya jika memiliki subtask) */}
          {initialSubtasks && initialSubtasks.length > 0 && (
            <TaskSubtasks
              taskId={task.id}
              initialSubtasks={initialSubtasks}
              canEdit={true}
            />
          )}



          {/* Hasil Pengerjaan Link Card */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900">
                  Tautan Link Hasil Akhir
                </CardTitle>
                {task.link_hasil ? (
                  <Badge variant="success" className="text-xs">
                    Sudah Diserahkan
                  </Badge>
                ) : (
                  <Badge variant="warning" className="text-xs">
                    Belum Ada Link Hasil
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {task.link_hasil ? (
                <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-500 mb-1">
                      Tautan Hasil Akhir / Preview:
                    </div>
                    <div className="text-sm font-medium text-indigo-700 truncate font-mono">
                      {task.link_hasil}
                    </div>
                  </div>
                  <Button asChild size="sm" className="gap-1.5 shrink-0">
                    <a href={task.link_hasil} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Buka Hasil Kerja
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 text-xs border border-dashed rounded-xl bg-slate-50">
                  Pegawai belum menyerahkan tautan link hasil karya.
                </div>
              )}
            </CardContent>
          </Card>



          {/* TAHAP 5: Riwayat & Log Aktivitas Tugas */}
          <TaskActivityTimeline activities={activities} />
        </div>

        {/* Right Column: Pusat Kontrol & Assignees */}
        <div className="space-y-6">

          {/* Quick Status Bar */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                Pusat Kontrol Cepat
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Ubah alur pekerjaan secara manual jika diperlukan.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdatingStatus || task.status === 'Sedang Dikerjakan'}
                    onClick={() => handleStatusChange('Sedang Dikerjakan')}
                    className="justify-start gap-2 text-slate-700 text-xs"
                  >
                    Ubah ke Sedang Dikerjakan
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUpdatingStatus || task.status === 'Menunggu Review'}
                    onClick={() => handleStatusChange('Menunggu Review')}
                    className="justify-start gap-2 text-slate-700 text-xs"
                  >
                    Ubah ke Menunggu Review
                  </Button>
                </div>
              </div>

              {isUpdatingStatus && (
                <div className="flex items-center gap-2 text-xs text-indigo-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Memperbarui status tugas...</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignees Card */}
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900">
                  Tim Yang Ditugaskan
                </CardTitle>
                <span className="text-xs font-semibold text-slate-400">
                  {(task.assignees || []).length} Staf
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {(task.assignees || []).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Belum ada pegawai yang ditugaskan.
                </div>
              ) : (
                task.assignees?.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={a.profile?.foto}
                        fallback={a.profile?.nama || 'U'}
                        alt={a.profile?.nama}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-900 truncate">
                          {a.profile?.nama}
                        </div>
                        <div className="text-xs text-slate-500 truncate">
                          {a.profile?.spesialisasi || 'Pegawai Kreatif'}
                        </div>
                      </div>
                    </div>

                    <Badge variant="outline" className="text-[10px] py-0.5 px-2">
                      Assignee
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CONFIRMATION DIALOG FOR DELETE */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogClose onClose={() => setDeleteDialogOpen(false)} />
        <DialogHeader>
          <DialogTitle>Hapus Tugas Ini?</DialogTitle>
          <DialogDescription>
            Tugas <strong>&quot;{task.judul}&quot;</strong> akan dipindahkan ke arsip (soft delete). Anda dapat memulihkannya kembali kapan saja melalui menu Arsip &amp; Sampah.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Hapus Tugas
          </Button>
        </DialogFooter>
      </Dialog>

      {/* DIALOG EDIT TUGAS (KHUSUS STATUS BELUM DIMULAI) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} className="max-w-2xl">
        <DialogContent>
          <form onSubmit={handleSaveEdit} className="space-y-4 px-1.5 py-1">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">
                Edit Detail Tugas (Internal)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Perubahan hanya dapat disimpan saat tugas belum mulai dikerjakan oleh pegawai. Riwayat pengeditan akan dicatat otomatis di Log Aktivitas.
              </DialogDescription>
            </DialogHeader>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                <span>{editError}</span>
              </div>
            )}

            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="admin-edit-judul" className="text-xs font-semibold">
                  Judul Tugas <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="admin-edit-judul"
                  value={editJudul}
                  onChange={(e) => setEditJudul(e.target.value)}
                  required
                  className="text-xs py-2.5"
                />
              </div>

              {/* Baris 1: Jenis Pekerjaan & Tingkat Prioritas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="admin-edit-jenis" className="text-xs font-semibold">
                    Jenis Pekerjaan
                  </Label>
                  <select
                    id="admin-edit-jenis"
                    value={editJenis}
                    onChange={(e) => setEditJenis(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                  >
                    <option value="Video Editing">Video Editing</option>
                    <option value="Desain E-Flyer">Desain E-Flyer</option>
                    <option value="Motion Graphic">Motion Graphic</option>
                    <option value="Banner Digital">Banner Digital</option>
                    {categories
                      .filter(
                        (c) =>
                          c.nama !== 'Video Editing' &&
                          c.nama !== 'Desain E-Flyer' &&
                          c.nama !== 'Motion Graphic' &&
                          c.nama !== 'Banner Digital'
                      )
                      .map((c) => (
                        <option key={c.id} value={c.nama}>
                          {c.nama}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="admin-edit-prioritas" className="text-xs font-semibold">
                    Tingkat Prioritas
                  </Label>
                  <select
                    id="admin-edit-prioritas"
                    value={editPrioritas}
                    onChange={(e) => setEditPrioritas(e.target.value as TaskPriority)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                  >
                    <option value="Rendah">Rendah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Tinggi">Tinggi</option>
                    <option value="Urgent">Urgent (Mendesak)</option>
                  </select>
                </div>
              </div>

              {/* Baris 2: Tanggal & Pukul Deadline dengan Popover Interaktif */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DatePickerPopover
                  label="Batas Waktu (Deadline)"
                  required
                  value={editDate}
                  onChange={setEditDate}
                />

                <TimePickerPopover
                  label="Pukul (WIB)"
                  value={editTime}
                  onChange={setEditTime}
                />
              </div>

              {/* Baris 3: Brief & Instruksi Pengerjaan */}
              <div className="space-y-1.5">
                <Label htmlFor="admin-edit-deskripsi" className="text-xs font-semibold">
                  Brief & Instruksi Pengerjaan Lengkap
                </Label>
                <Textarea
                  id="admin-edit-deskripsi"
                  rows={8}
                  value={editDeskripsi}
                  onChange={(e) => setEditDeskripsi(e.target.value)}
                  className="text-xs font-normal leading-relaxed p-3.5 min-h-[160px]"
                  placeholder="Tuliskan arahan lengkap di sini..."
                />
              </div>

              <div className="pt-2">
                <NarasumberUploader
                  value={editLinkRef}
                  onChange={setEditLinkRef}
                  label="Foto & Data Narasumber (Maks. 3 Narasumber)"
                  description="Upload secara bergantian untuk menghindari kegagalan, dan pastikan nama dan foto narasumber sudah sesuai"
                />
              </div>

              {/* Opsi Upload Sosmed */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <input
                  type="checkbox"
                  id="admin-edit-sosmed"
                  checked={editPerluUploadSosmed}
                  onChange={(e) => setEditPerluUploadSosmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="admin-edit-sosmed" className="cursor-pointer select-none space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                    <Share2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    Publikasikan Konten ke Media Sosial (Tugas Posting)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Jika dicentang, materi akan otomatis masuk ke menu Tugas Posting Pengelola Sosmed setelah disetujui (Selesai).
                  </p>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSavingEdit}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingEdit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 font-semibold"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan Perubahan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
