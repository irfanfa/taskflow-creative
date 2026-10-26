'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { TaskWithAssignees, Profile, TaskCategory, TaskStatus, TaskPriority } from '@/types/database';
import { softDeleteTask, generateHolidayFlyersAction } from '@/app/actions/tasks';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/tasks/status-badge';
import { PriorityBadge } from '@/components/tasks/priority-badge';
import { DeadlineIndicator } from '@/components/tasks/deadline-indicator';
import { Avatar } from '@/components/ui/avatar';
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
  Plus,
  Search,
  Filter,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  ArrowUpDown,
  List,
  Kanban as KanbanIcon,
  CalendarDays,
  Sparkles,
  Archive,
} from 'lucide-react';
import { useTasksListRealtime } from '@/hooks/use-task-realtime';

interface TaskListClientProps {
  initialTasks: TaskWithAssignees[];
  employees: Profile[];
  categories: TaskCategory[];
  archivedCount?: number;
}

export function TaskListClient({ initialTasks, employees, categories, archivedCount = 0 }: TaskListClientProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithAssignees[]>(initialTasks);
  const [currentArchivedCount, setCurrentArchivedCount] = useState(archivedCount);
  const [isSyncingHolidays, setIsSyncingHolidays] = useState(false);

  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Realtime Live-Sync: sinkronisasi otomatis daftar tugas & kanban saat ada perubahan dari staf lain
  useTasksListRealtime({
    channelName: 'admin-tasks-list-live',
  });

  // Tampilan aktif: 'list' | 'kanban' | 'kalender'
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'kalender'>('list');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua');
  const [selectedPriority, setSelectedPriority] = useState<string>('Semua');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('Semua');
  const [sortOrder, setSortOrder] = useState<'deadline-asc' | 'deadline-desc' | 'created-desc'>('deadline-asc');

  // Date range filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskWithAssignees | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<React.ReactNode | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Sync Hari Besar Otomatis
  const handleSyncHolidays = async () => {
    setIsSyncingHolidays(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await generateHolidayFlyersAction();
      if (res.success) {
        setActionSuccess(res.message || 'Berhasil menyinkronkan tugas e-flyer hari besar.');
        router.refresh();
      } else {
        setActionError(res.error || 'Gagal sinkronisasi tugas hari besar.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      setActionError(msg);
    } finally {
      setIsSyncingHolidays(false);
    }
  };

  // Filter logic
  const filteredTasks = tasks
    .filter((task) => {
      // 1. Search Query (judul atau klien)
      const matchesSearch =
        task.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.klien_proyek.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Status Filter
      const matchesStatus =
        selectedStatus === 'Semua'
          ? true
          : selectedStatus === 'Dalam Antrean' || selectedStatus === 'Belum Dimulai'
          ? task.status === 'Dalam Antrean' || task.status === 'Belum Dimulai'
          : task.status === selectedStatus;

      // 3. Priority Filter
      const matchesPriority =
        selectedPriority === 'Semua' ? true : task.prioritas === selectedPriority;

      // 4. Category Filter
      const matchesCategory =
        selectedCategory === 'Semua' ? true : task.jenis_pekerjaan === selectedCategory;

      // 5. Employee Filter
      const matchesEmployee =
        selectedEmployee === 'Semua'
          ? true
          : (task.assignees || []).some((a) => a.user_id === selectedEmployee);

      // 6. Date Range Filter (Berdasarkan deadline)
      let matchesDate = true;
      const taskDeadline = new Date(task.deadline);
      if (startDate) {
        matchesDate = matchesDate && taskDeadline >= new Date(startDate);
      }
      if (endDate) {
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && taskDeadline <= endD;
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesCategory &&
        matchesEmployee &&
        matchesDate
      );
    })
    .sort((a, b) => {
      if (sortOrder === 'deadline-asc') {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (sortOrder === 'deadline-desc') {
        return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const handleDelete = async () => {
    if (!taskToDelete) return;

    setIsDeleting(true);
    const res = await softDeleteTask(taskToDelete.id);
    setIsDeleting(false);

    if (res.success) {
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      setCurrentArchivedCount((prev) => prev + 1);
      setDeleteDialogOpen(false);
      setActionSuccess(
        <div className="flex items-center justify-between w-full">
          <span>Tugas &quot;{taskToDelete.judul}&quot; berhasil dipindahkan ke arsip (Soft Delete).</span>
          <Link
            href="/admin/tugas/arsip"
            className="underline font-bold hover:text-emerald-950 inline-flex items-center gap-1 ml-3 shrink-0"
          >
            Buka Arsip &amp; Sampah &rarr;
          </Link>
        </div>
      );
      setTimeout(() => setActionSuccess(null), 6000);
    } else {
      setActionError(res.error || 'Gagal menghapus tugas.');
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Banner & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 w-full min-w-0 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Panel Administrator
            </span>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">WIB (UTC+7)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
            Manajemen Tugas Tim
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pantau progres penugasan tim kreatif, status pengerjaan, dan batas waktu penyelesaian.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full md:w-auto min-w-0">
          {/* Tombol Pindah Tampilan (List / Kanban / Kalender) */}
          <div className="inline-flex self-start rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70 p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Daftar
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('kalender')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                viewMode === 'kalender'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Kalender
            </button>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSyncHolidays}
              disabled={isSyncingHolidays}
              className="col-span-1 text-xs font-medium border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 h-9 px-3"
            >
              {isSyncingHolidays && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 text-amber-600 shrink-0" />}
              <span className="truncate">{isSyncingHolidays ? 'Menyinkronkan...' : 'Sinkronkan Hari Besar'}</span>
            </Button>

            <Button
              asChild
              variant="outline"
              size="sm"
              className="col-span-1 text-xs font-medium border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 h-9 px-3"
            >
              <Link href="/admin/tugas/arsip" className="justify-center">
                <span>Arsip</span>
                {currentArchivedCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {currentArchivedCount}
                  </span>
                )}
              </Link>
            </Button>

            <Button asChild size="sm" className="col-span-2 sm:col-span-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs h-9 px-4">
              <Link href="/admin/tugas/baru" className="justify-center">
                Buat Tugas Baru
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Alert Notification */}
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

      {/* VIEW MODE 1: LIST / TABEL */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {/* Filter and Search Box */}
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Baris 1: Search & Sorting */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative w-full sm:flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Cari judul tugas atau nama klien..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10 text-xs sm:text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:border-slate-400 dark:hover:border-slate-600"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    Urutkan:
                  </span>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    aria-label="Urutkan Tugas"
                    className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors flex-1 sm:flex-none"
                  >
                    <option value="deadline-asc">Deadline Terdekat</option>
                    <option value="deadline-desc">Deadline Terjauh</option>
                    <option value="created-desc">Terbaru Dibuat</option>
                  </select>
                </div>
              </div>

              {/* Baris 2: Dropdown Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                {/* Filter Status */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    aria-label="Filter Status"
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  >
                    <option value="Semua">Semua Status</option>
                    <option value="Dalam Antrean">Dalam Antrean</option>
                    <option value="Sedang Dikerjakan">Sedang Dikerjakan</option>
                    <option value="Menunggu Review">Menunggu Review</option>
                    <option value="Revisi">Revisi</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>

                {/* Filter Prioritas */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Prioritas</label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    aria-label="Filter Prioritas"
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  >
                    <option value="Semua">Semua Prioritas</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Tinggi">Tinggi</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>

                {/* Filter Jenis / Kategori */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Jenis Pekerjaan</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    aria-label="Filter Jenis Pekerjaan"
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  >
                    <option value="Semua">Semua Jenis</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.nama}>
                        {cat.nama}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter Pegawai */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Pegawai PJ</label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    aria-label="Filter Pegawai PJ"
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                  >
                    <option value="Semua">Semua Pegawai</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nama} ({emp.spesialisasi || 'Pegawai'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Baris 3: Rentang Tanggal Deadline */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  Rentang Batas Waktu:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950 hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    title="Dari tanggal"
                  />
                  <span className="text-slate-400">s/d</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-950 hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    title="Sampai tanggal"
                  />
                  {(startDate || endDate || selectedStatus !== 'Semua' || selectedPriority !== 'Semua' || selectedCategory !== 'Semua' || selectedEmployee !== 'Semua' || searchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedStatus('Semua');
                        setSelectedPriority('Semua');
                        setSelectedCategory('Semua');
                        setSelectedEmployee('Semua');
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold underline underline-offset-2 ml-2 transition-colors"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Task List Table */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden w-full max-w-full min-w-0">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Daftar Tugas ({filteredTasks.length} pekerjaan)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Pekerjaan diurutkan berdasarkan batas waktu terdekat untuk memprioritaskan penyelesaian deadline.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredTasks.length === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="Tidak ada tugas ditemukan"
                  description="Coba sesuaikan kata kunci pencarian atau ubah kombinasi filter status/prioritas di atas."
                  className="m-6"
                />
              ) : (
                <div className="overflow-x-auto w-full max-w-full">
                  <table className="w-full min-w-[680px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="py-3 px-4 sm:px-6">Judul Tugas & Klien</th>
                        <th className="py-3 px-4">Prioritas & Status</th>
                        <th className="py-3 px-4">Batas Waktu (Deadline)</th>
                        <th className="py-3 px-4">Tim Kreatif (Assignee)</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {filteredTasks.map((task) => (
                        <tr key={task.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                          {/* Judul & Klien */}
                          <td className="py-4 px-4 sm:px-6 min-w-[240px]">
                            <div className="space-y-1">
                              <Link
                                href={`/admin/tugas/${task.id}`}
                                className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-1 transition-colors"
                              >
                                {task.judul}
                              </Link>
                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                                <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                  {task.jenis_pekerjaan}
                                </span>
                                <span>&bull;</span>
                                <span className="truncate max-w-[150px]">{task.klien_proyek}</span>
                                {task.revision_count !== undefined && task.revision_count > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                                    Revisi #{task.revision_count}
                                  </span>
                                )}
                                {task.subtasks_total !== undefined && task.subtasks_total > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{task.subtasks_completed || 0}/{task.subtasks_total}</span>
                                    <span>({Math.round(((task.subtasks_completed || 0) / task.subtasks_total) * 100)}%)</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Prioritas & Status */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex flex-col gap-1.5 items-start">
                              <StatusBadge status={task.status} />
                              <PriorityBadge priority={task.prioritas} />
                            </div>
                          </td>

                          {/* Deadline Indicator */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <DeadlineIndicator
                              deadline={task.deadline}
                              isCompleted={task.status === 'Selesai'}
                            />
                          </td>

                          {/* Assignees */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex items-center -space-x-2">
                              {(task.assignees || []).length > 0 ? (
                                task.assignees?.map((a) => (
                                  <div
                                    key={a.id}
                                    className="relative group"
                                    title={`${a.profile?.nama} (${a.profile?.spesialisasi || 'Pegawai'})`}
                                  >
                                    <Avatar
                                      src={a.profile?.foto}
                                      fallback={a.profile?.nama || 'U'}
                                      alt={a.profile?.nama}
                                      size="sm"
                                      className="ring-2 ring-white dark:ring-slate-900"
                                    />
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400 italic">Belum ada</span>
                              )}
                            </div>
                          </td>

                          {/* Aksi */}
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
                                <Link href={`/admin/tugas/${task.id}`} title="Lihat Detail Tugas">
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setTaskToDelete(task);
                                  setDeleteDialogOpen(true);
                                }}
                                className="h-8 px-2 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                                title="Hapus Tugas (Soft Delete)"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* VIEW MODE 2: KANBAN */}
      {viewMode === 'kanban' && (
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

      {/* VIEW MODE 3: KALENDER */}
      {viewMode === 'kalender' && (
        <TaskCalendar
          tasks={tasks}
          role="admin"
          title="Kalender Tim Kreatif"
          description="Batas waktu seluruh tugas tim kreatif dalam kalender bulanan dan mingguan (WIB)."
        />
      )}

      {/* Dialog Konfirmasi Soft Delete */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        {taskToDelete && (
          <div className="space-y-4">
            <DialogHeader>
              <div className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                Konfirmasi Hapus
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                Pindahkan Tugas ke Arsip?
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Tindakan ini akan menyembunyikan tugas dari antrean kerja aktif (Soft Delete). Data tetap tersimpan untuk keperluan audit.
              </DialogDescription>
            </DialogHeader>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-100">{taskToDelete.judul}</div>
              <div className="text-slate-500 dark:text-slate-400">
                Klien: <strong className="text-slate-700 dark:text-slate-200">{taskToDelete.klien_proyek}</strong> &bull; Status: <strong className="text-slate-700 dark:text-slate-200">{taskToDelete.status}</strong>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button variant="outline" size="sm" disabled={isDeleting}>
                  Batal
                </Button>
              </DialogClose>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="gap-2 bg-rose-600 hover:bg-rose-700 font-semibold"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Ya, Hapus Tugas
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}
