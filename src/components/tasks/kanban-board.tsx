'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { TaskWithAssignees, TaskStatus, Profile, UserRole } from '@/types/database';
import { updateTaskStatus } from '@/app/actions/tasks';
import { PriorityBadge } from '@/components/tasks/priority-badge';
import { DeadlineIndicator } from '@/components/tasks/deadline-indicator';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  ExternalLink,
  GripVertical,
  CheckSquare,
  RotateCcw,
} from 'lucide-react';

interface KanbanBoardProps {
  tasks: TaskWithAssignees[];
  role: UserRole;
  currentUserId?: string;
  employees?: Profile[];
  onTaskUpdated?: (updatedTask: TaskWithAssignees) => void;
}

interface ColumnConfig {
  id: TaskStatus;
  title: string;
  dotColor: string;
  badgeBg: string;
  headerBorder: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'Dalam Antrean',
    title: 'Dalam Antrean',
    dotColor: 'bg-slate-400',
    badgeBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700',
    headerBorder: 'border-slate-300 dark:border-slate-700',
  },
  {
    id: 'Sedang Dikerjakan',
    title: 'Sedang Dikerjakan',
    dotColor: 'bg-blue-500',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    headerBorder: 'border-blue-400 dark:border-blue-700',
  },
  {
    id: 'Menunggu Review',
    title: 'Menunggu Review',
    dotColor: 'bg-purple-500',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    headerBorder: 'border-purple-400 dark:border-purple-700',
  },
  {
    id: 'Revisi',
    title: 'Revisi',
    dotColor: 'bg-orange-500',
    badgeBg: 'bg-orange-50 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    headerBorder: 'border-orange-400 dark:border-orange-700',
  },
  {
    id: 'Selesai',
    title: 'Selesai',
    dotColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    headerBorder: 'border-emerald-400 dark:border-emerald-700',
  },
];

export function KanbanBoard({
  tasks: initialTasks,
  role,
  currentUserId,
  employees = [],
  onTaskUpdated,
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskWithAssignees[]>(initialTasks);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<TaskStatus | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('Semua');
  const [selectedPriority, setSelectedPriority] = useState('Semua');

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sinkronisasi tasks jika prop initialTasks berubah
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.klien_proyek.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesEmployee =
      selectedEmployee === 'Semua'
        ? true
        : (task.assignees || []).some((a) => a.user_id === selectedEmployee);

    const matchesPriority =
      selectedPriority === 'Semua' ? true : task.prioritas === selectedPriority;

    return matchesSearch && matchesEmployee && matchesPriority;
  });

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  // Handle Drag Over
  const handleDragOver = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropColumn !== columnId) {
      setActiveDropColumn(columnId);
    }
  };

  // Handle Drag Leave
  const handleDragLeave = () => {
    setActiveDropColumn(null);
  };

  // Handle Drop
  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setActiveDropColumn(null);

    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);

    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Jika status tidak berubah, tidak perlu diproses
    if (task.status === targetStatus) return;

    // VALIDASI HAK AKSES PERAN PEGAWAI
    if (role === 'pegawai') {
      // 1. Pegawai dilarang menandai tugas sebagai 'Selesai'
      if (targetStatus === 'Selesai') {
        setFeedback({
          type: 'error',
          message:
            'Akses Ditolak: Hanya Administrator yang berwenang menyetujui dan menyelesaikan tugas (Selesai). Silakan pindahkan ke "Menunggu Review".',
        });
        setTimeout(() => setFeedback(null), 5000);
        return;
      }

      // 2. Pegawai tidak berwenang memindahkan status ke 'Revisi'
      if (targetStatus === 'Revisi') {
        setFeedback({
          type: 'error',
          message:
            'Status Revisi hanya dapat ditentukan oleh Administrator setelah memeriksa hasil pekerjaan.',
        });
        setTimeout(() => setFeedback(null), 5000);
        return;
      }
    }

    // Optimistic UI Update
    const previousStatus = task.status;
    const updatedTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, status: targetStatus } : t
    );
    setTasks(updatedTasks);

    setFeedback({
      type: 'success',
      message: `Status tugas "${task.judul}" diubah menjadi "${targetStatus}".`,
    });
    setTimeout(() => setFeedback(null), 3500);

    // Panggil server action
    try {
      const res = await updateTaskStatus({
        id: taskId,
        status: targetStatus,
      });

      if (!res.success) {
        // Rollback jika server menolak
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: previousStatus } : t))
        );
        setFeedback({
          type: 'error',
          message: res.error || 'Gagal mengubah status tugas di server.',
        });
      } else if (onTaskUpdated) {
        onTaskUpdated({ ...task, status: targetStatus });
      }
    } catch (err: unknown) {
      // Rollback
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: previousStatus } : t))
      );
      setFeedback({
        type: 'error',
        message: 'Terjadi kesalahan jaringan saat memperbarui status.',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Alert feedback toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm font-medium animate-in fade-in-50 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Cari tugas di papan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Filter Pegawai jika Admin */}
          {role === 'admin' && employees.length > 0 && (
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              aria-label="Filter Pegawai"
              className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <option value="Semua">Semua Pegawai</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nama} ({emp.spesialisasi || 'Staf'})
                </option>
              ))}
            </select>
          )}

          {/* Filter Prioritas */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            aria-label="Filter Prioritas"
            className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <option value="Semua">Semua Prioritas</option>
            <option value="Urgent">Urgent</option>
            <option value="Tinggi">Tinggi</option>
            <option value="Sedang">Sedang</option>
            <option value="Rendah">Rendah</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
          Total: <strong className="text-slate-800 dark:text-slate-200">{filteredTasks.length}</strong> tugas
        </div>
      </div>

      {/* Kanban Columns Horizontal Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => {
            if (col.id === 'Dalam Antrean' || col.id === 'Belum Dimulai') {
              return t.status === 'Dalam Antrean' || t.status === 'Belum Dimulai';
            }
            return t.status === col.id;
          });
          const isOver = activeDropColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col rounded-2xl border transition-all duration-200 min-h-[480px] bg-slate-50/70 dark:bg-slate-950/50 ${
                isOver
                  ? 'border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-200 ring-offset-1'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* Column Header */}
              <div
                className={`flex items-center justify-between p-3.5 border-b bg-white dark:bg-slate-900 rounded-t-2xl ${col.headerBorder}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-full ${col.dotColor} shrink-0`} />
                  <h3 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate">
                    {col.title}
                  </h3>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full border ${col.badgeBg}`}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 p-2.5 space-y-3 overflow-y-auto max-h-[70vh]">
                {colTasks.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 text-center">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">Tidak ada tugas</span>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const isDragging = draggedTaskId === task.id;
                    const detailLink =
                      role === 'admin'
                        ? `/admin/tugas/${task.id}`
                        : role === 'sosmed'
                        ? `/sosmed/tugas/${task.id}`
                        : role === 'pep'
                        ? `/pep/tugas/${task.id}`
                        : `/pegawai/tugas/${task.id}`;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        className={`group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all cursor-grab active:cursor-grabbing ${
                          isDragging ? 'opacity-40 scale-95 border-dashed border-indigo-400' : ''
                        }`}
                      >
                        {/* Drag Handle Indicator */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="font-semibold text-[10px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 uppercase tracking-wider truncate max-w-[140px]">
                            {task.jenis_pekerjaan}
                          </span>
                          <PriorityBadge priority={task.prioritas} />
                        </div>

                        {/* Title & Link */}
                        <Link
                          href={detailLink}
                          className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 leading-snug"
                        >
                          {task.judul}
                        </Link>

                        {/* Revision Badge (Jika ada revisi) */}
                        {task.revision_count !== undefined && task.revision_count > 0 && (
                          <div className="mt-1 flex items-center justify-end text-[11px]">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                              Rev #{task.revision_count}
                            </span>
                          </div>
                        )}

                        {/* Subtask / Checklist Progress Bar */}
                        {task.subtasks_total !== undefined && task.subtasks_total > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium">
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

                        {/* Deadline Indicator */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between gap-1 text-[11px]">
                          <DeadlineIndicator
                            deadline={task.deadline}
                            isCompleted={task.status === 'Selesai'}
                          />
                        </div>

                        {/* Assignees avatars & detail link */}
                        <div className="mt-2.5 flex items-center justify-between">
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {(task.assignees || []).map((a) => (
                              <div
                                key={a.id}
                                title={a.profile?.nama || 'Pegawai'}
                                className="ring-2 ring-white dark:ring-slate-900 rounded-full"
                              >
                                <Avatar
                                  src={a.profile?.foto}
                                  fallback={a.profile?.nama || 'U'}
                                  alt={a.profile?.nama || 'U'}
                                  size="sm"
                                  className="h-6 w-6 text-[10px]"
                                />
                              </div>
                            ))}
                          </div>

                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[10px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <Link href={detailLink}>
                              Detail
                            </Link>
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
