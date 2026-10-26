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
import { markTaskAsPosted, unmarkTaskAsPosted } from '@/app/actions/tasks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/tasks/status-badge';
import { PriorityBadge } from '@/components/tasks/priority-badge';
import { DeadlineIndicator } from '@/components/tasks/deadline-indicator';
import { NarasumberDisplay } from '@/components/media/narasumber-display';
import { TaskSubtasks } from '@/components/collaboration/task-subtasks';
import { TaskActivityTimeline } from '@/components/collaboration/task-activity-timeline';
import { useTaskRealtime } from '@/hooks/use-task-realtime';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Send,
  CheckCircle2,
  AlertCircle,
  Globe,
  FileCheck2,
  Users,
  RotateCcw,
  Sparkles,
  Share2,
  Loader2,
  FileText,
  FolderOpen,
} from 'lucide-react';

interface SosmedTaskDetailClientProps {
  task: TaskWithAssignees;
  currentProfile: Profile;
  initialSubtasks: TaskSubtask[];
  initialActivities: TaskActivity[];
}

function formatWIB(dateStr?: string | null) {
  if (!dateStr) return '-';
  try {
    return (
      new Intl.DateTimeFormat('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }).format(new Date(dateStr)) + ' WIB'
    );
  } catch {
    return dateStr;
  }
}

export function SosmedTaskDetailClient({
  task: initialTask,
  currentProfile,
  initialSubtasks,
  initialActivities,
}: SosmedTaskDetailClientProps) {
  const router = useRouter();
  const [task, setTask] = useState<TaskWithAssignees>(initialTask);
  const [activities, setActivities] = useState<TaskActivity[]>(initialActivities);

  useEffect(() => {
    setTask(initialTask);
  }, [initialTask]);

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  // Realtime Live-Sync: sinkronisasi otomatis saat ada pembaruan status / postingan
  useTaskRealtime({
    taskId: task.id,
    onUpdate: (updatedFields) => {
      setTask((prev) => ({
        ...prev,
        ...updatedFields,
      }));
    },
  });

  // Modal Tandai Sudah Diposting State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [linkPosting, setLinkPosting] = useState('');
  const [catatanPosting, setCatatanPosting] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnmarking, setIsUnmarking] = useState(false);

  // Feedback State
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const isCompleted = task.status === 'Selesai';
  const isPosted =
    (task as any).status_posting === 'sudah_diposting' ||
    Boolean((task as any).posted_at);

  const handleOpenPostingModal = () => {
    setLinkPosting((task as any).link_posting || '');
    setCatatanPosting((task as any).catatan_posting || '');
    setIsModalOpen(true);
  };

  const handleSubmitPosted = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    const res = await markTaskAsPosted({
      taskId: task.id,
      link_posting: linkPosting,
      catatan_posting: catatanPosting,
    });

    setIsSubmitting(false);

    if (res.success) {
      setTask((prev) => ({
        ...prev,
        status_posting: 'sudah_diposting',
        link_posting: linkPosting.trim() || null,
        catatan_posting: catatanPosting.trim() || null,
        posted_at: new Date().toISOString(),
      } as any));
      setIsModalOpen(false);
      setFeedbackSuccess('Status publikasi berhasil diperbarui: Sudah Diposting.');
      router.refresh();
    } else {
      setFeedbackError(res.error || 'Gagal menandai publikasi tugas.');
    }
  };

  const handleUnmarkPosted = async () => {
    if (!confirm('Yakin ingin membatalkan status sudah diposting untuk tugas ini?')) {
      return;
    }

    setIsUnmarking(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);

    const res = await unmarkTaskAsPosted(task.id);
    setIsUnmarking(false);

    if (res.success) {
      setTask((prev) => ({
        ...prev,
        status_posting: 'menunggu_posting',
        posted_at: null,
      } as any));
      setFeedbackSuccess('Status publikasi berhasil dikembalikan ke Antrean Siap Diposting.');
      router.refresh();
    } else {
      setFeedbackError(res.error || 'Gagal membatalkan status publikasi.');
    }
  };

  const handleCopyLinkHasil = async () => {
    if (!task.link_hasil) return;
    try {
      await navigator.clipboard.writeText(task.link_hasil);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.warn('Gagal menyalin:', err);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs text-slate-700 dark:text-slate-200">
            <Link href="/sosmed/tugas-posting">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Antrean Tugas Posting</span>
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="text-xs text-slate-500 hover:text-slate-900">
            <Link href="/sosmed">
              Tugas Saya
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {isPosted ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Sudah Diposting
            </span>
          ) : isCompleted ? (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Siap Diposting
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Status: {task.status}
            </span>
          )}
        </div>
      </div>

      {/* Global Feedback Banners */}
      {feedbackSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-sm font-medium flex items-center justify-between gap-3 animate-in fade-in-50">
          <span>{feedbackSuccess}</span>
          <button
            onClick={() => setFeedbackSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold"
          >
            Tutup
          </button>
        </div>
      )}

      {feedbackError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm font-medium flex items-center justify-between gap-3 animate-in fade-in-50">
          <span>{feedbackError}</span>
          <button
            onClick={() => setFeedbackError(null)}
            className="text-rose-700 hover:text-rose-900 text-xs font-semibold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Task Header Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-100 dark:border-indigo-900/50">
              {task.jenis_pekerjaan}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Klien: <strong className="text-slate-800 dark:text-slate-200">{task.klien_proyek}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge prioritas={task.prioritas} />
            <StatusBadge status={task.status} />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {task.judul}
        </h1>

        <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>Tenggat Waktu:</span>
            <DeadlineIndicator deadline={task.deadline} isCompleted={isCompleted} />
          </div>
          {task.creator && (
            <div className="flex items-center gap-2">
              <span>Dibuat oleh: <strong className="text-slate-700 dark:text-slate-300">{task.creator.nama}</strong> ({task.creator.role.toUpperCase()})</span>
            </div>
          )}
        </div>
      </div>

      {/* Social Media Posting Control Center */}
      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Status Publikasi Media Sosial
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Kelola penayangan materi karya ini ke kanal media sosial resmi
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isPosted ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUnmarkPosted}
                    disabled={isUnmarking}
                    className="text-xs text-slate-600 hover:text-rose-600 border-slate-300 dark:border-slate-700 h-8"
                  >
                    {isUnmarking && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                    <span>Batalkan Tayang</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenPostingModal}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-medium shadow-xs"
                  >
                    Edit Info Postingan
                  </Button>
                </>
              ) : isCompleted ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleOpenPostingModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 font-medium shadow-xs"
                >
                  Tandai Sudah Diposting
                </Button>
              ) : (
                <span className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                  Menunggu Penyelesaian Tugas
                </span>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-4">
          {isPosted ? (
            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 font-semibold text-emerald-900 dark:text-emerald-200">
                <span>
                  Tayang pada: <strong>{formatWIB((task as any).posted_at)}</strong>
                </span>

                {(task as any).link_posting && (
                  <a
                    href={(task as any).link_posting}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 hover:underline font-semibold"
                  >
                    <span>Buka Tautan Postingan</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {(task as any).catatan_posting && (
                <div className="pt-2 border-t border-emerald-200/80 dark:border-emerald-900/40 text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-emerald-950 dark:text-emerald-300 block mb-0.5">Keterangan / Platform:</span>
                  <p className="italic">&ldquo;{(task as any).catatan_posting}&rdquo;</p>
                </div>
              )}
            </div>
          ) : isCompleted ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <p className="font-semibold text-slate-900 dark:text-white">Materi Karya Telah Selesai & Disetujui</p>
              <p className="text-slate-500 dark:text-slate-400">
                Tugas ini siap ditayangkan ke media sosial (Instagram, TikTok, YouTube, dsb). Setelah diposting, klik tombol <strong>Tandai Sudah Diposting</strong> untuk mencatat URL publikasi dan waktu tayang.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
              Tugas ini saat ini berstatus <strong>{task.status}</strong>. Pengelola Sosmed akan memposting materi setelah tugas ini dituntaskan dan disetujui (Selesai).
            </div>
          )}

          {/* Materi Visual / Link Hasil Karya Section */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <span>
                Materi Visual Hasil Karya
              </span>

              {task.link_hasil && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLinkHasil}
                    className="h-7 px-2 text-[11px] gap-1"
                  >
                    {copiedLink ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedLink ? 'Tersalin' : 'Salin Tautan'}</span>
                  </Button>
                  <Button asChild size="sm" className="h-7 px-2.5 text-[11px] gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
                    <a href={task.link_hasil} target="_blank" rel="noreferrer">
                      <span>Buka File</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              )}
            </div>

            {task.link_hasil ? (
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-indigo-600 dark:text-indigo-400 break-all">
                {task.link_hasil}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 italic">
                Belum ada tautan file hasil akhir yang dicantumkan. Periksa instruksi brief atau diskusikan di kolom aktivitas di bawah.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grid: Brief & Kolaborasi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Brief, Spesifikasi, Checklist, Diskusi */}
        <div className="lg:col-span-2 space-y-6">
          {/* Brief Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Brief & Instruksi Pengerjaan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {task.deskripsi || 'Tidak ada catatan brief tambahan.'}
              </p>

              <NarasumberDisplay linkReferensi={task.link_referensi} />
            </CardContent>
          </Card>

          {/* Spesifikasi Teknis (Jika ada) */}
          {task.spesifikasi_teknis && Object.keys(task.spesifikasi_teknis).length > 0 && (
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
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
                      <span className="font-bold text-slate-700 dark:text-slate-200">
                        {String(value) || '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Checklist / Subtasks */}
          <TaskSubtasks
            taskId={task.id}
            initialSubtasks={initialSubtasks}
            canEdit={false}
          />

          {/* Diskusi & Activity Timeline */}
          <TaskActivityTimeline
            activities={activities}
          />
        </div>

        {/* Right Column (1 Col): Detail Metadata & Assignees */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Informasi Tugas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4 text-xs">
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-1">Klien / Proyek</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {task.klien_proyek}
                </span>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-1">Jenis Pekerjaan</span>
                <Badge variant="outline" className="font-semibold">
                  {task.jenis_pekerjaan}
                </Badge>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-1">Prioritas</span>
                <PriorityBadge prioritas={task.prioritas} />
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-1">Status Pengerjaan</span>
                <StatusBadge status={task.status} />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 block mb-1">Batas Waktu (Deadline)</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatWIB(task.deadline)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tim Pelaksana (Assignees) Card */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
                <span>Tim Pelaksana (PJ)</span>
                <span className="text-xs font-normal text-slate-500">
                  {task.assignees?.length || 0} orang
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-3">
              {(!task.assignees || task.assignees.length === 0) ? (
                <p className="text-xs text-slate-400 italic">Belum ada pelaksana yang ditugaskan.</p>
              ) : (
                task.assignees.map((assignee) => {
                  const prof = assignee.profile;
                  if (!prof) return null;
                  const isCurrentUser = prof.id === currentProfile.id;
                  return (
                    <div
                      key={assignee.id}
                      className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${
                        isCurrentUser ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <Avatar
                        src={prof.foto || undefined}
                        fallback={prof.nama}
                        alt={prof.nama}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {prof.nama}
                          </span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 dark:bg-indigo-950 px-1.5 py-0.2 rounded">
                              Anda
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize block truncate">
                          {prof.role === 'sosmed' ? 'Pengelola Sosmed' : prof.spesialisasi || prof.role}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL TANDAI SUDAH DIPOSTING */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmitPosted} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Konfirmasi Publikasi Media Sosial
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Tandai bahwa materi karya <strong className="text-slate-800 dark:text-slate-200">{task.judul}</strong> telah berhasil ditayangkan di kanal sosial media resmi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-1">
              {/* Tautan Postingan */}
              <div className="space-y-1.5">
                <Label htmlFor="linkPostingDetail" className="text-xs font-semibold">
                  Tautan / Link Postingan (Instagram, TikTok, YouTube, dll)
                </Label>
                <Input
                  id="linkPostingDetail"
                  type="url"
                  placeholder="https://instagram.com/p/... atau https://youtube.com/..."
                  value={linkPosting}
                  onChange={(e) => setLinkPosting(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Opsional, cantumkan URL postingan agar tim dan pimpinan dapat langsung meninjau.
                </p>
              </div>

              {/* Catatan / Keterangan */}
              <div className="space-y-1.5">
                <Label htmlFor="catatanPostingDetail" className="text-xs font-semibold">
                  Keterangan Publikasi / Platform
                </Label>
                <Input
                  id="catatanPostingDetail"
                  placeholder="Contoh: Tayang di Feed & Reels Instagram @kmbteam"
                  value={catatanPosting}
                  onChange={(e) => setCatatanPosting(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Status Publikasi</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
