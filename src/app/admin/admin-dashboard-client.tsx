'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Profile, TaskWithAssignees } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/tasks/status-badge';
import { PriorityBadge } from '@/components/tasks/priority-badge';
import { DeadlineIndicator } from '@/components/tasks/deadline-indicator';
import { WorkloadChart } from '@/components/dashboard/workload-chart';
import { StatusDonutChart } from '@/components/dashboard/status-donut-chart';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { TaskCalendar } from '@/components/tasks/task-calendar';

interface AdminDashboardClientProps {
  currentProfile: Profile | null;
  tasks: TaskWithAssignees[];
  employees: Profile[];
}

export function AdminDashboardClient({
  currentProfile,
  tasks: initialTasks,
  employees,
}: AdminDashboardClientProps) {
  const [tasks, setTasks] = useState<TaskWithAssignees[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'kanban' | 'kalender'>('ringkasan');

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 1. Total Tugas Aktif (status bukan 'Selesai')
  const activeTasks = tasks.filter((t) => t.status !== 'Selesai');

  // 2. Mendekati Deadline (<= 3 hari ke depan dan belum selesai)
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const approachingDeadlineTasks = activeTasks.filter((t) => {
    const d = new Date(t.deadline);
    return d >= now && d <= threeDaysFromNow;
  });

  // 3. Terlambat (deadline lewat dan belum selesai)
  const overdueTasks = activeTasks.filter((t) => {
    const d = new Date(t.deadline);
    return d < now;
  });

  // 4. Selesai Bulan Ini (status 'Selesai')
  const completedThisMonthTasks = tasks.filter((t) => {
    if (t.status !== 'Selesai') return false;
    const updateDate = new Date(t.updated_at || t.deadline);
    return updateDate.getMonth() === currentMonth && updateDate.getFullYear() === currentYear;
  });

  // 5 Tugas Paling Urgent
  const priorityWeights: Record<string, number> = {
    Urgent: 4,
    Tinggi: 3,
    Sedang: 2,
    Rendah: 1,
  };

  const top5UrgentTasks = [...activeTasks]
    .sort((a, b) => {
      const weightA = priorityWeights[a.prioritas] || 0;
      const weightB = priorityWeights[b.prioritas] || 0;
      if (weightB !== weightA) {
        return weightB - weightA;
      }
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    })
    .slice(0, 5);

  const currentDateWIB = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(now);

  return (
    <div className="space-y-6">
      {/* Harmonized Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard Administrator
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {currentDateWIB} &bull; Pantau performa tim kreatif, beban kerja, dan tugas mendekati batas waktu
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            asChild
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs"
          >
            <Link href="/admin/tugas/baru">
              Buat Tugas Baru
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
          >
            <Link href="/admin/pegawai">
              Kelola Pegawai ({employees.length})
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Kartu Metrik Utama (Clean typography without square icon clutter) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Metrik 1: Total Tugas Aktif */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Tugas Aktif
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {activeTasks.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 truncate">
            Dalam proses pengerjaan
          </div>
        </div>

        {/* Metrik 2: Mendekati Deadline */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Mendekati Deadline
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {approachingDeadlineTasks.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 truncate">
            Batas waktu &le; 3 hari
          </div>
        </div>

        {/* Metrik 3: Terlambat */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
          <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
            Tugas Terlambat
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400">
            {overdueTasks.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 truncate">
            Melewati batas waktu
          </div>
        </div>

        {/* Metrik 4: Selesai Bulan Ini */}
        <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Selesai Bulan Ini
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
            {completedThisMonthTasks.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500 truncate">
            Tuntas &amp; disetujui
          </div>
        </div>
      </div>

      {/* Segmented Control Tab Switcher (Unified across all panels) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('ringkasan')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'ringkasan'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Ringkasan &amp; Visualisasi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kanban')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'kanban'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Papan Kanban
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kalender')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'kalender'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Kalender Tim
          </button>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Total tugas: <strong className="text-slate-800 dark:text-slate-200">{tasks.length}</strong>
        </div>
      </div>

      {/* Konten Tab 1: Ringkasan & Visualisasi */}
      {activeTab === 'ringkasan' && (
        <div className="space-y-6">
          {/* Grafik Bar Beban Kerja & Grafik Donut Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WorkloadChart employees={employees} tasks={tasks} />
            <StatusDonutChart tasks={tasks} />
          </div>

          {/* Daftar 5 Tugas Paling Urgent */}
          <Card className="border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs rounded-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 p-4 sm:p-5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                  Daftar 5 Tugas Paling Urgent
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tugas berprioritas tinggi dan mendekati batas waktu yang memerlukan perhatian.
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-semibold">
                <Link href="/admin/tugas">
                  Kelola Semua ({tasks.length})
                </Link>
              </Button>
            </CardHeader>

            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {top5UrgentTasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Tidak ada tugas aktif mendesak saat ini.
                  </div>
                ) : (
                  top5UrgentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 sm:px-5 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1 min-w-0">
                        <Link
                          href={`/admin/tugas/${task.id}`}
                          className="font-bold text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1"
                        >
                          {task.judul}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">
                            {task.jenis_pekerjaan}
                          </span>
                          <span>&bull;</span>
                          <span className="truncate max-w-[200px]">{task.klien_proyek}</span>
                          <span>&bull;</span>
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400">PJ:</span>
                            <div className="flex -space-x-1">
                              {(task.assignees || []).map((a) => (
                                <Avatar
                                  key={a.id}
                                  src={a.profile?.foto}
                                  fallback={a.profile?.nama || 'U'}
                                  alt={a.profile?.nama || 'U'}
                                  size="sm"
                                  className="h-5 w-5 text-[9px] ring-1 ring-white dark:ring-slate-900"
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <PriorityBadge priority={task.prioritas} />
                        <StatusBadge status={task.status} />
                        <DeadlineIndicator deadline={task.deadline} isCompleted={task.status === 'Selesai'} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Konten Tab 2: Papan Kanban */}
      {activeTab === 'kanban' && (
        <KanbanBoard
          tasks={tasks}
          role="admin"
          employees={employees}
          onTaskUpdated={(updated) => {
            setTasks((prev) =>
              prev.map((t) => (t.id === updated.id ? updated : t))
            );
          }}
        />
      )}

      {/* Konten Tab 3: Kalender Tim */}
      {activeTab === 'kalender' && (
        <TaskCalendar
          tasks={tasks}
          role="admin"
          title="Kalender Tim Kreatif"
          description="Seluruh tenggat waktu tugas tim dalam kalender interaktif zona WIB."
        />
      )}
    </div>
  );
}
