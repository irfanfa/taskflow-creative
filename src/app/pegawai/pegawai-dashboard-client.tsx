'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Profile, TaskWithAssignees, TaskStatus } from '@/types/database';
import { updateTaskStatus } from '@/app/actions/tasks';
import { filterPegawaiUpcomingTasks } from '@/lib/tasks/pegawai-filter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/tasks/status-badge';
import { PriorityBadge } from '@/components/tasks/priority-badge';
import { DeadlineIndicator } from '@/components/tasks/deadline-indicator';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { TaskCalendar } from '@/components/tasks/task-calendar';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Loader2,
  Layers,
} from 'lucide-react';
import { useTasksListRealtime } from '@/hooks/use-task-realtime';

interface PegawaiDashboardClientProps {
  currentProfile: Profile;
  initialTasks: TaskWithAssignees[];
  activeMembers: Profile[];
}

export function PegawaiDashboardClient({
  currentProfile,
  initialTasks,
  activeMembers,
}: PegawaiDashboardClientProps) {
  const [tasks, setTasks] = useState<TaskWithAssignees[]>(() => filterPegawaiUpcomingTasks(initialTasks));

  useEffect(() => {
    setTasks(filterPegawaiUpcomingTasks(initialTasks));
  }, [initialTasks]);

  // Realtime Live-Sync: sinkronisasi otomatis saat Admin/PEP menugaskan pekerjaan baru atau mengubah status
  useTasksListRealtime({
    channelName: `pegawai-dashboard-live-${currentProfile.id}`,
  });

  // Tampilan aktif: 'list' | 'kanban' | 'kalender'
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'kalender'>('list');

  // Tab filter di tampilan list
  const [activeTab, setActiveTab] = useState<'Semua' | 'Perlu Tindakan' | 'Sedang Dikerjakan' | 'Menunggu Review' | 'Selesai'>('Semua');

  // Submit Result Modal state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignees | null>(null);
  const [linkHasil, setLinkHasil] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const now = new Date();

  // Helper cek apakah tanggal sama (hari ini)
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // 1. Tugas Hari Ini: deadline hari ini ATAU status Sedang Dikerjakan
  const todayTasks = tasks.filter((t) => {
    if (t.status === 'Selesai') return false;
    const isDeadlineToday = isSameDay(new Date(t.deadline), now);
    return isDeadlineToday || t.status === 'Sedang Dikerjakan';
  });

  // 2. Mendekati Deadline: sisa deadline <= 3 hari ke depan & belum selesai
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const approachingDeadlineTasks = tasks.filter((t) => {
    if (t.status === 'Selesai') return false;
    const d = new Date(t.deadline);
    return d >= now && d <= threeDaysFromNow;
  });

  // 3. Terlambat: deadline lewat & belum selesai
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'Selesai') return false;
    const d = new Date(t.deadline);
    return d < now;
  });

  // 4. Progres Mingguan: hitung tugas minggu ini (Senin - Minggu)
  const curr = new Date(now);
  let dayOfWeek = curr.getDay() - 1;
  if (dayOfWeek === -1) dayOfWeek = 6;
  const startOfWeek = new Date(curr);
  startOfWeek.setDate(curr.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const tasksThisWeek = tasks.filter((t) => {
    const d = new Date(t.deadline);
    return d >= startOfWeek && d <= endOfWeek;
  });

  const completedThisWeek = tasksThisWeek.filter((t) => t.status === 'Selesai').length;
  const totalThisWeek = tasksThisWeek.length;
  const weeklyProgressPercent =
    totalThisWeek > 0 ? Math.round((completedThisWeek / totalThisWeek) * 100) : 100;

  // Filter tasks based on tab
  const filteredTasks = tasks.filter((task) => {
    if (activeTab === 'Semua') return true;
    if (activeTab === 'Perlu Tindakan') return task.status === 'Belum Dimulai' || task.status === 'Dalam Antrean' || task.status === 'Revisi';
    if (activeTab === 'Sedang Dikerjakan') return task.status === 'Sedang Dikerjakan';
    if (activeTab === 'Menunggu Review') return task.status === 'Menunggu Review';
    if (activeTab === 'Selesai') return task.status === 'Selesai';
    return true;
  });

  // Action: Mulai Kerjakan (Belum Dimulai -> Sedang Dikerjakan)
  const handleStartTask = async (task: TaskWithAssignees) => {
    const res = await updateTaskStatus({
      id: task.id,
      status: 'Sedang Dikerjakan',
    });

    if (res.success) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: 'Sedang Dikerjakan' } : t))
      );
      setFeedbackSuccess(`Tugas "${task.judul}" sekarang dalam status Sedang Dikerjakan.`);
      setTimeout(() => setFeedbackSuccess(null), 4000);
    } else {
      setFeedbackError(res.error || 'Gagal mengubah status.');
      setTimeout(() => setFeedbackError(null), 4000);
    }
  };

  // Action: Submit Link Hasil & Ganti ke Menunggu Review
  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !linkHasil) return;

    setIsSubmitting(true);
    const res = await updateTaskStatus({
      id: selectedTask.id,
      status: 'Menunggu Review',
      link_hasil: linkHasil,
    });
    setIsSubmitting(false);

    if (res.success) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id
            ? { ...t, status: 'Menunggu Review', link_hasil: linkHasil }
            : t
        )
      );
      setSubmitModalOpen(false);
      setLinkHasil('');
      setFeedbackSuccess(
        `Hasil karya untuk "${selectedTask.judul}" berhasil dikirim untuk direview!`
      );
      setTimeout(() => setFeedbackSuccess(null), 4000);
    } else {
      setFeedbackError(res.error || 'Gagal mengirim hasil kerja.');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Halaman Pegawai */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {currentProfile.role === 'sosmed' ? 'Panel Pengelola Sosmed' : 'Panel Pegawai'}
            </span>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">WIB (UTC+7)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tugas Saya &bull; {currentProfile.nama}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola penugasan aktif, laporkan kemajuan pengerjaan, dan serahkan tautan hasil karya tepat waktu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {currentProfile.spesialisasi === 'Video Editor' && (
            <Badge variant="specVideo" className="text-xs py-1 px-3 font-medium">
              Video Editor
            </Badge>
          )}
          {currentProfile.spesialisasi === 'Desainer Grafis' && (
            <Badge variant="specDesain" className="text-xs py-1 px-3 font-medium">
              Desainer Grafis
            </Badge>
          )}
          <Badge variant="success" className="text-xs py-1 px-3 font-medium">
            Akun Aktif
          </Badge>
        </div>
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

      {/* 4 Kartu Metrik Pegawai: Tugas Hari Ini, Mendekati Deadline, Terlambat, Progres Mingguan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metrik 1: Tugas Hari Ini */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-1 p-3.5 sm:p-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Tugas Hari Ini
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {todayTasks.length}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Fokus kerja saat ini</p>
          </CardContent>
        </Card>

        {/* Metrik 2: Mendekati Deadline */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-1 p-3.5 sm:p-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Mendekati Deadline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {approachingDeadlineTasks.length}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Batas waktu &le; 3 hari</p>
          </CardContent>
        </Card>

        {/* Metrik 3: Terlambat */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-1 p-3.5 sm:p-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Terlambat
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {overdueTasks.length}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Melewati batas waktu</p>
          </CardContent>
        </Card>

        {/* Metrik 4: Progres Mingguan */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-1 p-3.5 sm:p-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Progres Mingguan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {weeklyProgressPercent}%
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {completedThisWeek}/{totalThisWeek} selesai
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${weeklyProgressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Switcher: List vs Kanban vs Kalender */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70 p-1">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Daftar Tugas
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              viewMode === 'kanban'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Papan Kanban
          </button>
          <button
            onClick={() => setViewMode('kalender')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              viewMode === 'kalender'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Kalender Saya
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          Menampilkan <strong className="text-slate-800 dark:text-slate-200">{tasks.length}</strong> tugas miliknya
        </div>
      </div>

      {/* VIEW MODE 1: LIST / CARD VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* Status Filter Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-1">
            {(['Semua', 'Perlu Tindakan', 'Sedang Dikerjakan', 'Menunggu Review', 'Selesai'] as const).map(
              (tab) => {
                const count =
                  tab === 'Semua'
                    ? tasks.length
                    : tab === 'Perlu Tindakan'
                    ? tasks.filter((t) => t.status === 'Belum Dimulai' || t.status === 'Dalam Antrean' || t.status === 'Revisi').length
                    : tasks.filter((t) => t.status === tab).length;

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap ${
                      activeTab === tab
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'
                    }`}
                  >
                    <span>{tab}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        activeTab === tab
                          ? 'bg-slate-700 text-slate-200 dark:bg-slate-200 dark:text-slate-800 font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          {/* Task Cards Grid */}
          {filteredTasks.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="Tidak ada tugas pada tab ini"
              description="Seluruh pekerjaan Anda pada kategori ini telah selesai atau belum ada penugasan baru dari Administrator."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTasks.map((task) => (
                <Card
                  key={task.id}
                  className="border-slate-200 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
                >
                  <CardHeader className="p-4 sm:p-5 pb-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-semibold text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                        {task.jenis_pekerjaan}
                      </span>
                      <PriorityBadge priority={task.prioritas} />
                    </div>

                    <Link
                      href={currentProfile.role === 'sosmed' ? `/sosmed/tugas/${task.id}` : `/pegawai/tugas/${task.id}`}
                      className="font-bold text-base text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1 transition-colors"
                    >
                      {task.judul}
                    </Link>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>Klien: <strong className="text-slate-700 dark:text-slate-300">{task.klien_proyek}</strong></span>
                      {task.revision_count !== undefined && task.revision_count > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          Revisi #{task.revision_count}
                        </span>
                      )}
                    </div>

                    {/* Subtask / Checklist Progress Bar */}
                    {task.subtasks_total !== undefined && task.subtasks_total > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span className="text-slate-600 dark:text-slate-400">
                            Checklist
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {task.subtasks_completed || 0}/{task.subtasks_total} ({Math.round(((task.subtasks_completed || 0) / task.subtasks_total) * 100)}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              (task.subtasks_completed || 0) === task.subtasks_total
                                ? 'bg-emerald-500'
                                : 'bg-indigo-500'
                            }`}
                            style={{
                              width: `${Math.round(((task.subtasks_completed || 0) / task.subtasks_total) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <StatusBadge status={task.status} />
                      <DeadlineIndicator
                        deadline={task.deadline}
                        isCompleted={task.status === 'Selesai'}
                      />
                    </div>

                    {/* Quick Action Button */}
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                      >
                        <Link href={currentProfile.role === 'sosmed' ? `/sosmed/tugas/${task.id}` : `/pegawai/tugas/${task.id}`}>
                          Lihat Detail
                        </Link>
                      </Button>

                      {/* Tombol aksi cepat sesuai status */}
                      {(task.status === 'Belum Dimulai' || task.status === 'Dalam Antrean') && (
                        <Button
                          size="sm"
                          onClick={() => handleStartTask(task)}
                          className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                        >
                          Mulai Kerjakan
                        </Button>
                      )}

                      {(task.status === 'Sedang Dikerjakan' || task.status === 'Revisi') && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedTask(task);
                            setLinkHasil(task.link_hasil || '');
                            setSubmitModalOpen(true);
                          }}
                          className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
                        >
                          Kirim Hasil
                        </Button>
                      )}

                      {task.status === 'Menunggu Review' && (
                        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded border border-amber-200 dark:border-amber-800">
                          Menunggu Review
                        </span>
                      )}

                      {task.status === 'Selesai' && (
                        <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                          Selesai
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: KANBAN BOARD UNTUK PEGAWAI */}
      {viewMode === 'kanban' && (
        <KanbanBoard
          tasks={tasks}
          role="pegawai"
          currentUserId={currentProfile.id}
          onTaskUpdated={(updated) => {
            setTasks((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            );
          }}
        />
      )}

      {/* VIEW MODE 3: KALENDER SAYA */}
      {viewMode === 'kalender' && (
        <TaskCalendar
          tasks={tasks}
          role="pegawai"
          title="Kalender Saya"
          description="Batas waktu seluruh tugas yang ditugaskan kepada Anda dalam zona waktu Asia/Jakarta (WIB)."
        />
      )}

      {/* Modal Penyerahan Hasil Kerja Cepat */}
      <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
        {selectedTask && (
          <form onSubmit={handleSubmitWork} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Serahkan Hasil Karya
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Kirimkan tautan Google Drive / Figma / Frame.io / Cloud Storage untuk ditinjau.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-100">{selectedTask.judul}</div>
                <div className="text-slate-500 dark:text-slate-400 mt-0.5">Klien: {selectedTask.klien_proyek}</div>
              </div>

              <div>
                <Label htmlFor="link_hasil_quick" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tautan Link Hasil Akhir <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="link_hasil_quick"
                  type="url"
                  placeholder="https://drive.google.com/... atau link cloud storage"
                  value={linkHasil}
                  onChange={(e) => setLinkHasil(e.target.value)}
                  required
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm" disabled={isSubmitting}>
                  Batal
                </Button>
              </DialogClose>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !linkHasil.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                Kirim untuk Direview
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </div>
  );
}
