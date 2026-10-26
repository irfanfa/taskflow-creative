'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type {
  TaskWithAssignees,
  Profile,
  TaskSubtask,
  TaskActivity,
} from '@/types/database';
import { updateTaskStatus } from '@/app/actions/tasks';
import { submitWorkForReview } from '@/app/actions/collaboration';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/tasks/status-badge';
import { PriorityBadge } from '@/components/tasks/priority-badge';
import { DeadlineIndicator } from '@/components/tasks/deadline-indicator';
import { NarasumberDisplay } from '@/components/media/narasumber-display';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  PlayCircle,
  Send,
  CheckCircle2,
  AlertCircle,
  Video,
  Palette,
  Shield,
  Loader2,
  Users,
  RotateCcw,
} from 'lucide-react';

// Tahap 5 Collaboration Components
import { TaskSubtasks } from '@/components/collaboration/task-subtasks';
import { TaskActivityTimeline } from '@/components/collaboration/task-activity-timeline';
import { useTaskRealtime } from '@/hooks/use-task-realtime';

interface PegawaiTaskDetailClientProps {
  task: TaskWithAssignees;
  currentProfile: Profile;
  initialSubtasks: TaskSubtask[];
  initialActivities: TaskActivity[];
}

export function PegawaiTaskDetailClient({
  task: initialTask,
  currentProfile,
  initialSubtasks,
  initialActivities,
}: PegawaiTaskDetailClientProps) {
  const router = useRouter();
  const [task, setTask] = useState<TaskWithAssignees>(initialTask);
  const [activities, setActivities] = useState<TaskActivity[]>(initialActivities);

  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  // Realtime Live-Sync: sinkronisasi otomatis saat ada pembaruan status / revisi dari Admin
  useTaskRealtime({
    taskId: task.id,
    onUpdate: (updatedFields) => {
      setTask((prev) => ({
        ...prev,
        ...updatedFields,
      }));
    },
  });

  const [linkHasil, setLinkHasil] = useState(task.link_hasil || '');
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const isVideo = task.jenis_pekerjaan.toLowerCase().includes('video');
  const isCompleted = task.status === 'Selesai';

  // Action: Mulai Kerjakan (Belum Dimulai -> Sedang Dikerjakan)
  const handleStartTask = async () => {
    setIsLoading(true);
    setFeedbackError(null);

    const res = await updateTaskStatus({
      id: task.id,
      status: 'Sedang Dikerjakan',
    });
    setIsLoading(false);

    if (res.success) {
      setTask((prev) => ({ ...prev, status: 'Sedang Dikerjakan' }));
      setFeedbackSuccess('Status tugas berhasil diubah menjadi Sedang Dikerjakan. Selamat berkarya!');
      setTimeout(() => setFeedbackSuccess(null), 4000);
      router.refresh();
    } else {
      setFeedbackError(res.error || 'Gagal mengubah status.');
    }
  };

  // Action: Submit Hasil Karya (Ganti status ke Menunggu Review)
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkHasil || !linkHasil.trim()) {
      setFeedbackError('Harap cantumkan tautan hasil akhir (Google Drive, Figma, video cloud, dll).');
      return;
    }

    setIsLoading(true);
    setFeedbackError(null);

    const res = await submitWorkForReview({
      taskId: task.id,
      linkHasil: linkHasil || undefined,
    });
    setIsLoading(false);

    if (res.success) {
      setTask((prev) => ({ ...prev, status: 'Menunggu Review', link_hasil: linkHasil || prev.link_hasil }));
      setFeedbackSuccess('Hasil kerja berhasil dikirimkan ke Administrator untuk ditinjau.');
      setTimeout(() => setFeedbackSuccess(null), 4000);
      router.refresh();
    } else {
      setFeedbackError(res.error || 'Gagal mengirim hasil kerja.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-slate-600 hover:text-slate-900">
          <Link href={currentProfile.role === 'sosmed' ? '/sosmed' : '/pegawai'}>
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Tugas Saya
          </Link>
        </Button>
      </div>

      {/* Global Alerts */}
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

      {/* TAHAP 5: Prominent Alert if Status is Revisi */}
      {task.status === 'Revisi' && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 shadow-xs space-y-2 animate-in fade-in-50">
          <div className="font-bold text-sm text-amber-950 dark:text-amber-100">
            Tugas Memerlukan Revisi (Revisi #{task.revision_count || 1})
          </div>
          {task.catatan_revisi ? (
            <div className="pl-8 text-xs text-slate-700 dark:text-amber-100/90 bg-white/70 dark:bg-slate-900/90 p-3 rounded-xl border border-amber-100 dark:border-amber-900/50 whitespace-pre-wrap">
              <strong className="text-amber-950 dark:text-amber-300 block mb-1">
                Catatan dari {task.creator?.role === 'pep' ? 'PEP (Siaran)' : 'Ketua Tim (Admin)'}:
              </strong>
              {task.catatan_revisi}
            </div>
          ) : (
            <p className="pl-8 text-xs text-amber-800 dark:text-amber-200/80">
              {task.creator?.role === 'pep' ? 'PEP (Siaran)' : 'Ketua Tim'}{' '}
              meminta perbaikan hasil karya. Silakan koordinasikan dan ajukan perbaikan terbaru.
            </p>
          )}
        </div>
      )}

      {/* Main Task Header Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-900/50">
              {task.jenis_pekerjaan}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700 dark:text-slate-300">Tenggat Waktu:</span>
            <DeadlineIndicator deadline={task.deadline} isCompleted={isCompleted} />
          </div>
        </div>
      </div>

      {/* Grid: Brief & Status Progression Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Brief, Spesifikasi, Checklist, Lampiran, Diskusi, Aktivitas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brief Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Brief & Instruksi Pengerjaan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {task.deskripsi || 'Tidak ada catatan brief tambahan.'}
              </p>

              <NarasumberDisplay linkReferensi={task.link_referensi} />
            </CardContent>
          </Card>

          {/* Spesifikasi Teknis Card (Hanya jika memiliki data spesifikasi) */}
          {task.spesifikasi_teknis && Object.keys(task.spesifikasi_teknis).length > 0 && (
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Spesifikasi Teknis ({task.jenis_pekerjaan})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  {Object.entries(task.spesifikasi_teknis || {}).map(([key, value]) => (
                    <div key={key} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                        {key.replace('_', ' ')}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">{String(value)}</span>
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
              canEdit={!isCompleted}
            />
          )}

          {/* TAHAP 5: Riwayat & Log Aktivitas Tugas */}
          <TaskActivityTimeline activities={activities} />
        </div>

        {/* Right Column: Submission Form & Action */}
        <div className="space-y-6">
          {/* Action Form */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                Pembaruan Status & Hasil Kerja
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Laporkan kemajuan atau serahkan hasil akhir pekerjaan Anda.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Scenario 1: Dalam Antrean / Belum Dimulai */}
              {(task.status === 'Belum Dimulai' || task.status === 'Dalam Antrean') && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                    Tugas ini ada <strong>Dalam Antrean</strong> dan siap dikerjakan. Klik tombol di bawah untuk mengubah status menjadi <strong>Sedang Dikerjakan</strong>.
                  </div>
                  <Button
                    onClick={handleStartTask}
                    disabled={isLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-9"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                    Mulai Kerjakan Tugas
                  </Button>
                </div>
              )}

              {/* Scenario 2: Sedang Dikerjakan atau Revisi */}
              {(task.status === 'Sedang Dikerjakan' || task.status === 'Revisi') && (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="link-hasil" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tautan Hasil Akhir (Cloud Link)
                    </Label>
                    <Input
                      id="link-hasil"
                      placeholder="https://drive.google.com/... atau https://figma.com/..."
                      value={linkHasil}
                      onChange={(e) => setLinkHasil(e.target.value)}
                      className="text-xs"
                    />
                    <p className="text-[11px] text-slate-400">
                      Tautan dokumen Google Drive, folder cloud storage, atau file preview hasil kerja.
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-9"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                    {task.status === 'Revisi' ? 'Kirim Hasil Perbaikan (Review Lagi)' : 'Kirim untuk Direview Admin'}
                  </Button>
                </form>
              )}

              {/* Scenario 3: Menunggu Review */}
              {task.status === 'Menunggu Review' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                    <div className="font-semibold text-amber-800 dark:text-amber-300">
                      Sedang Ditinjau Administrator
                    </div>
                    <p className="leading-relaxed">
                      Hasil karya telah diserahkan dan sedang menunggu persetujuan atau catatan revisi dari Admin.
                    </p>
                  </div>

                  {task.link_hasil && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Tautan Terkirim:</span>
                      <a
                        href={task.link_hasil}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        <span className="truncate max-w-[200px]">{task.link_hasil}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Scenario 4: Selesai */}
              {isCompleted && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs space-y-1">
                  <div className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                    Tugas Tuntas & Disetujui
                  </div>
                  <p className="leading-relaxed">
                    Pekerjaan ini telah diverifikasi dan ditandai selesai oleh Administrator. Terima kasih atas dedikasi Anda!
                  </p>
                </div>
              )}

              {/* Role Security Notice */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                Sesuai kebijakan keamanan, Pegawai tidak dapat menandai tugas menjadi <strong>Selesai</strong> secara sepihak.
              </div>
            </CardContent>
          </Card>

          {/* Fellow Assignees Card */}
          {(task.assignees || []).length > 1 && (
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  Rekan Kolaborator Tugas Ini
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2.5">
                {task.assignees
                  ?.filter((a) => a.user_id !== currentProfile.id)
                  .map((a) => (
                    <div key={a.id} className="flex items-center gap-3">
                      <Avatar
                        src={a.profile?.foto}
                        fallback={a.profile?.nama || 'U'}
                        alt={a.profile?.nama}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {a.profile?.nama}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {a.profile?.spesialisasi}
                        </div>
                      </div>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
