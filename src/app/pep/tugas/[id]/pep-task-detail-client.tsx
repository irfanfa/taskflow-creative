'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  ExternalLink,
  Video,
  Palette,
  FileCheck2,
  Loader2,
  Sparkles,
  Clock,
  Edit3,
  Share2,
} from 'lucide-react';
import type {
  TaskWithAssignees,
  Profile,
  TaskPriority,
  TaskCategory,
  TaskSubtask,
  TaskActivity,
} from '@/types/database';
import { approveTask, requestTaskRevision } from '@/app/actions/collaboration';
import { updateTask } from '@/app/actions/tasks';
import { StatusBadge } from '@/components/tasks/status-badge';
import { PriorityBadge } from '@/components/tasks/priority-badge';
import { DeadlineIndicator } from '@/components/tasks/deadline-indicator';
import { TaskSubtasks } from '@/components/collaboration/task-subtasks';
import { TaskActivityTimeline } from '@/components/collaboration/task-activity-timeline';
import { NarasumberUploader } from '@/components/media/narasumber-uploader';
import { NarasumberDisplay } from '@/components/media/narasumber-display';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerPopover } from '@/components/ui/date-picker-popover';
import { TimePickerPopover } from '@/components/ui/time-picker-popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTaskRealtime } from '@/hooks/use-task-realtime';

interface PepTaskDetailClientProps {
  task: TaskWithAssignees;
  currentProfile: Profile;
  initialSubtasks: TaskSubtask[];
  initialActivities: TaskActivity[];
  categories?: TaskCategory[];
}

export function PepTaskDetailClient({
  task: initialTask,
  currentProfile,
  initialSubtasks,
  initialActivities,
  categories = [],
}: PepTaskDetailClientProps) {
  const router = useRouter();
  const [task, setTask] = useState<TaskWithAssignees>(initialTask);
  const [activities, setActivities] = useState<TaskActivity[]>(initialActivities);

  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  // Realtime Live-Sync: sinkronisasi otomatis saat ada pembaruan tugas dari pegawai
  useTaskRealtime({
    taskId: task.id,
    onUpdate: (updatedFields) => {
      setTask((prev) => ({
        ...prev,
        ...updatedFields,
      }));
    },
  });

  // Review & Revision States
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [catatanRevisi, setCatatanRevisi] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRequestingRevision, setIsRequestingRevision] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const isCompleted = task.status === 'Selesai';
  const isVideo =
    task.jenis_pekerjaan.toLowerCase().includes('video') ||
    task.jenis_pekerjaan.toLowerCase().includes('reels');

  // Handle Save Edit by PEP
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!editJudul.trim()) {
      setEditError('Judul tugas wajib diisi.');
      return;
    }
    if (!editDate) {
      setEditError('Tanggal batas waktu wajib diisi.');
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
      router.refresh();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Approve by PEP
  const handleApprove = async () => {
    setActionError(null);
    setIsApproving(true);

    try {
      const res = await approveTask({ taskId: task.id });
      if (!res.success) {
        setActionError(res.error || 'Gagal menyetujui tugas.');
        setIsApproving(false);
        return;
      }

      setTask((prev) => ({ ...prev, status: 'Selesai' }));
      router.refresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle Request Revision by PEP
  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catatanRevisi.trim()) {
      setActionError('Catatan revisi wajib diisi.');
      return;
    }

    setActionError(null);
    setIsRequestingRevision(true);

    try {
      const res = await requestTaskRevision({
        taskId: task.id,
        catatanRevisi: catatanRevisi.trim(),
      });

      if (!res.success) {
        setActionError(res.error || 'Gagal mengirim permintaan revisi.');
        setIsRequestingRevision(false);
        return;
      }

      setTask((prev) => ({
        ...prev,
        status: 'Revisi',
        revision_count: res.revisionCount,
        catatan_revisi: catatanRevisi.trim(),
      }));
      setShowRevisionDialog(false);
      setCatatanRevisi('');
      router.refresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Terjadi kesalahan sistem');
    } finally {
      setIsRequestingRevision(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Top Header & Back Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/pep"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard PEP</span>
        </Link>

        <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-900/60 px-3 py-1 rounded-full">
          Tugas Dibuat oleh PEP (Siaran)
        </span>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Task Header Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-200/80 dark:border-amber-900/60">
              {task.jenis_pekerjaan}
            </span>
            {task.perlu_upload_sosmed && (
              <span className="font-semibold text-xs text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
                <Share2 className="h-3 w-3" />
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
                className="h-7 px-2.5 text-xs font-semibold border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/80 shadow-xs"
              >
                <span>Edit Tugas</span>
              </Button>
            )}
            <PriorityBadge prioritas={task.prioritas} />
            <StatusBadge status={task.status} />
            {task.revision_count !== undefined && task.revision_count > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
                Revisi #{task.revision_count}
              </span>
            )}
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          {task.judul}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-600 dark:text-slate-400">Tenggat Waktu (WIB):</span>
            <DeadlineIndicator deadline={task.deadline} isCompleted={isCompleted} />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">Pelaksana Tugas:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
              Pegawai (KMB)
            </span>
          </div>
        </div>
      </div>

      {/* TAHAP REVIEW KHUSUS PEP: TAMPIL JIKA STATUS MENUNGGU REVIEW */}
      {task.status === 'Menunggu Review' && (
        <Card className="border-2 border-amber-400 dark:border-amber-600/80 bg-amber-50/60 dark:bg-amber-950/40 shadow-md">
          <CardHeader className="pb-3 border-b border-amber-200/60 dark:border-amber-900/40">
            <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
              <FileCheck2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <CardTitle className="text-base font-bold">
                Tugas Siap Direview (Persetujuan Langsung PEP)
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-amber-800/90 dark:text-amber-300/90">
              Pegawai (KMB) telah menyerahkan hasil karya untuk tugas ini.
              Sesuai ketentuan, persetujuan dan revisi dilakukan langsung oleh Anda tanpa melalui persetujuan Ketua Tim.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {task.link_hasil && (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 block">
                    Tautan Hasil Akhir yang Diserahkan:
                  </span>
                  <a
                    href={task.link_hasil}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <span>{task.link_hasil}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <a
                  href={task.link_hasil}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" variant="outline" className="text-xs h-8 gap-1">
                    Buka Hasil
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </a>
              </div>
            )}

            {/* Opsi Form Revisi atau Tombol Aksi */}
            {!showRevisionDialog ? (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm px-6 h-10"
                >
                  {isApproving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Setujui Tugas (Selesai)'
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowRevisionDialog(true)}
                  disabled={isApproving}
                  className="border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/60 font-semibold text-xs h-10"
                >
                  Minta Revisi ke Pegawai (KMB)
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRequestRevision} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-amber-950 dark:text-amber-200 block">
                    Catatan Revisi untuk Pegawai (KMB) <span className="text-rose-500">*</span>
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Tuliskan bagian mana yang perlu diperbaiki (misal: warna font di detik 15 kurang kontras, potong durasi 5 detik)..."
                    value={catatanRevisi}
                    onChange={(e) => setCatatanRevisi(e.target.value)}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={isRequestingRevision}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 h-9"
                  >
                    {isRequestingRevision ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        Kirim Catatan Revisi
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowRevisionDialog(false);
                      setCatatanRevisi('');
                    }}
                    className="text-xs h-9"
                  >
                    Batal
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info jika status saat ini sedang Revisi */}
      {task.status === 'Revisi' && task.catatan_revisi && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
              <RotateCcw className="w-4 h-4" />
            </span>
            <span className="font-bold text-sm text-amber-950 dark:text-amber-100">
              Status: Sedang Dalam Proses Revisi (Revisi #{task.revision_count || 1})
            </span>
          </div>
          <div className="pl-7 text-xs bg-white/70 dark:bg-slate-900/80 p-3 rounded-xl border border-amber-100 dark:border-amber-900/40 whitespace-pre-wrap">
            <strong className="block text-amber-950 dark:text-amber-300 mb-1">
              Catatan Revisi dari Anda:
            </strong>
            {task.catatan_revisi}
          </div>
        </div>
      )}

      {/* Grid: Brief & Kolaborasi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Brief, Spesifikasi, Subtasks, Lampiran, Komentar */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brief Card */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Brief & Instruksi Pengerjaan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {task.deskripsi || 'Tidak ada catatan brief tambahan.'}
              </p>

              <NarasumberDisplay linkReferensi={task.link_referensi} />
            </CardContent>
          </Card>

          {/* Spesifikasi Teknis */}
          {task.spesifikasi_teknis && Object.keys(task.spesifikasi_teknis).length > 0 && (
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Spesifikasi Teknis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  {Object.entries(task.spesifikasi_teknis || {}).map(([key, value]) => (
                    <div key={key} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                        {key.replace('_', ' ')}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                        {String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Checklist / Subtasks (Hanya jika memiliki subtask) */}
          {initialSubtasks && initialSubtasks.length > 0 && (
            <TaskSubtasks
              taskId={task.id}
              initialSubtasks={initialSubtasks}
              canEdit={false}
            />
          )}

        </div>

        {/* Kolom Kanan: Linimasa Aktivitas */}
        <div className="space-y-6">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Informasi Pengerjaan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Status Tugas:</span>
                <StatusBadge status={task.status} />
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Prioritas:</span>
                <PriorityBadge prioritas={task.prioritas} />
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Penanggung Jawab:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Pegawai (KMB)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Pemberi Tugas:</span>
                <span className="font-semibold text-amber-700 dark:text-amber-300">PEP (Siaran)</span>
              </div>
            </CardContent>
          </Card>

          {/* Riwayat Linimasa */}
          <TaskActivityTimeline activities={activities} />
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} className="max-w-2xl">
        <DialogContent>
          <form onSubmit={handleSaveEdit} className="space-y-4 px-1.5 py-1">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-600" />
                Edit Detail Tugas Siaran
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Perubahan hanya dapat disimpan saat tugas belum mulai dikerjakan oleh pegawai. Riwayat pengeditan akan tercatat otomatis di Log Aktivitas.
              </DialogDescription>
            </DialogHeader>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                <span>{editError}</span>
              </div>
            )}

            <div className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="edit-judul" className="text-xs font-semibold">
                  Judul Tugas Siaran <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="edit-judul"
                  value={editJudul}
                  onChange={(e) => setEditJudul(e.target.value)}
                  required
                  className="text-xs py-2.5"
                />
              </div>

              {/* Baris 1: Jenis Pekerjaan & Tingkat Prioritas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-jenis" className="text-xs font-semibold">
                    Jenis Pekerjaan
                  </Label>
                  <select
                    id="edit-jenis"
                    value={editJenis}
                    onChange={(e) => setEditJenis(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
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
                  <Label htmlFor="edit-prioritas" className="text-xs font-semibold">
                    Tingkat Prioritas
                  </Label>
                  <select
                    id="edit-prioritas"
                    value={editPrioritas}
                    onChange={(e) => setEditPrioritas(e.target.value as TaskPriority)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
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
                <Label htmlFor="edit-deskripsi" className="text-xs font-semibold">
                  Brief & Instruksi Pengerjaan Lengkap
                </Label>
                <Textarea
                  id="edit-deskripsi"
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
                  id="pep-edit-sosmed"
                  checked={editPerluUploadSosmed}
                  onChange={(e) => setEditPerluUploadSosmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="pep-edit-sosmed" className="cursor-pointer select-none space-y-0.5">
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
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 font-semibold"
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
