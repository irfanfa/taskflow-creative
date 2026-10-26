'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { TaskWithAssignees, UserRole, TaskPriority } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/tasks/status-badge';
import { PriorityBadge } from '@/components/tasks/priority-badge';
import { DeadlineIndicator } from '@/components/tasks/deadline-indicator';
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
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface TaskCalendarProps {
  tasks: TaskWithAssignees[];
  role: UserRole;
  title?: string;
  description?: string;
}

export function TaskCalendar({
  tasks,
  role,
  title = 'Kalender Jadwal & Batas Waktu',
  description = 'Pantau deadline tugas dalam kalender interaktif zona WIB (Asia/Jakarta).',
}: TaskCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignees | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Navigasi Tanggal
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() - 1);
      } else {
        next.setDate(next.getDate() - 7);
      }
      return next;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === 'month') {
        next.setMonth(next.getMonth() + 1);
      } else {
        next.setDate(next.getDate() + 7);
      }
      return next;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Format header bulan & tahun
  const monthYearLabel = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(currentDate);

  // Warna event berdasarkan Prioritas
  const getPriorityClasses = (priority: TaskPriority) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800 hover:bg-rose-200 dark:hover:bg-rose-900/80';
      case 'Tinggi':
        return 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900/80';
      case 'Sedang':
        return 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/80';
      case 'Rendah':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700';
    }
  };

  // Helper memeriksa apakah tanggal sama (YYYY-MM-DD zona lokal)
  const isSameDay = (d1: Date, d2: Date) => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  // Generate data hari untuk Tampilan Bulan (Month View)
  const renderMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Hari dalam seminggu dimulai dari Senin (0: Senin, ..., 6: Minggu)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days = [];

    // Hari dari bulan sebelumnya
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }

    // Hari dari bulan saat ini
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Hari dari bulan berikutnya untuk melengkapi baris (kelipatan 7)
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        days.push({
          date: new Date(year, month + 1, i),
          isCurrentMonth: false,
        });
      }
    }

    const today = new Date();

    return days.map(({ date, isCurrentMonth }, idx) => {
      // Ambil tugas yang memiliki deadline pada tanggal ini
      const dayTasks = tasks.filter((t) => {
        const taskDeadline = new Date(t.deadline);
        return isSameDay(taskDeadline, date);
      });

      const isToday = isSameDay(date, today);

      return (
        <div
          key={idx}
          className={`min-h-[105px] p-2 border-b border-r border-slate-200 dark:border-slate-800 transition-colors ${
            !isCurrentMonth ? 'bg-slate-50/60 dark:bg-slate-950/60 text-slate-400 dark:text-slate-500' : 'bg-white dark:bg-slate-900'
          } ${isToday ? 'bg-indigo-50/40 dark:bg-indigo-950/40 ring-1 ring-inset ring-indigo-400' : ''}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className={`text-xs font-semibold inline-flex items-center justify-center h-6 w-6 rounded-full ${
                isToday
                  ? 'bg-indigo-600 text-white font-bold'
                  : isCurrentMonth
                  ? 'text-slate-700 dark:text-slate-200'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {date.getDate()}
            </span>
            {dayTasks.length > 0 && (
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400">
                {dayTasks.length} tugas
              </span>
            )}
          </div>

          {/* List Event Tasks */}
          <div className="space-y-1 overflow-y-auto max-h-[80px]">
            {dayTasks.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTask(t);
                  setModalOpen(true);
                }}
                className={`w-full text-left px-2 py-1 rounded text-[11px] font-medium border truncate block transition-all shadow-2xs ${getPriorityClasses(
                  t.prioritas
                )}`}
                title={`${t.judul} (${t.prioritas})`}
              >
                <div className="truncate flex items-center gap-1">
                  <span className="font-bold">{t.prioritas}:</span>
                  <span className="truncate">{t.judul}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    });
  };

  // Generate data hari untuk Tampilan Minggu (Week View)
  const renderWeekDays = () => {
    const today = new Date();
    const curr = new Date(currentDate);

    // Dapatkan hari Senin dari minggu saat ini
    let dayOfWeek = curr.getDay() - 1;
    if (dayOfWeek === -1) dayOfWeek = 6;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - dayOfWeek);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDays.push(d);
    }

    const dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

    return weekDays.map((date, idx) => {
      const dayTasks = tasks.filter((t) => {
        const taskDeadline = new Date(t.deadline);
        return isSameDay(taskDeadline, date);
      });

      const isToday = isSameDay(date, today);

      return (
        <div
          key={idx}
          className={`min-h-[300px] border-r border-b border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 ${
            isToday ? 'bg-indigo-50/30 dark:bg-indigo-950/40 ring-1 ring-inset ring-indigo-400' : ''
          }`}
        >
          <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              {dayNames[idx]}
            </div>
            <div
              className={`text-lg font-bold inline-flex items-center justify-center h-8 w-8 rounded-full mt-1 ${
                isToday ? 'bg-indigo-600 text-white font-bold' : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              {date.getDate()}
            </div>
          </div>

          {/* List Events */}
          <div className="space-y-2">
            {dayTasks.length === 0 ? (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-4">
                Tidak ada deadline
              </p>
            ) : (
              dayTasks.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTask(t);
                    setModalOpen(true);
                  }}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-transform hover:-translate-y-0.5 shadow-xs ${getPriorityClasses(
                    t.prioritas
                  )}`}
                >
                  <div className="font-bold line-clamp-2 leading-snug">{t.judul}</div>
                  <div className="text-[10px] mt-0.5 opacity-90 truncate font-medium">
                    {t.jenis_pekerjaan}
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-black/10 dark:border-white/10 text-[10px]">
                    <span className="font-semibold">{t.status}</span>
                    <span className="font-mono">
                      {new Intl.DateTimeFormat('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Asia/Jakarta',
                      }).format(new Date(t.deadline))}{' '}
                      WIB
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    });
  };

  const weekHeaders = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  return (
    <div className="space-y-4">
      {/* Calendar Header Controls */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70 p-1 text-xs font-semibold">
              <button
                onClick={() => setViewMode('month')}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  viewMode === 'month'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Bulan
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  viewMode === 'week'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Minggu
              </button>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-white dark:bg-slate-900">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrev}
                className="h-8 w-8 p-0"
                aria-label="Sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToday}
                className="h-8 px-2.5 text-xs font-semibold text-slate-700"
              >
                Hari Ini
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNext}
                className="h-8 w-8 p-0"
                aria-label="Berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-sm font-bold text-slate-900 capitalize min-w-[140px] text-right">
              {monthYearLabel}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend Prioritas */}
      <div className="flex flex-wrap items-center gap-4 px-1 text-xs text-slate-600 font-medium">
        <span>Prioritas Warna:</span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
          Urgent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          Tinggi
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          Sedang
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
          Rendah
        </span>
      </div>

      {/* Calendar Grid Container */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        {viewMode === 'month' ? (
          <div>
            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              {weekHeaders.map((name, i) => (
                <div key={i} className={i >= 5 ? 'text-rose-600' : ''}>
                  {name}
                </div>
              ))}
            </div>

            {/* Days Cells */}
            <div className="grid grid-cols-7 border-l border-slate-200">
              {renderMonthDays()}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-7 border-l border-slate-200">
            {renderWeekDays()}
          </div>
        )}
      </Card>

      {/* Modal Quick Detail Tugas */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        {selectedTask && (
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {selectedTask.jenis_pekerjaan}
                </span>
                <PriorityBadge priority={selectedTask.prioritas} />
                <StatusBadge status={selectedTask.status} />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {selectedTask.judul}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Kategori: <strong>{selectedTask.jenis_pekerjaan}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs text-slate-600 border-y border-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-500 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  Batas Waktu (Deadline WIB):
                </span>
                <DeadlineIndicator
                  deadline={selectedTask.deadline}
                  isCompleted={selectedTask.status === 'Selesai'}
                />
              </div>

              {selectedTask.deskripsi && (
                <div>
                  <span className="font-medium text-slate-500 block mb-1">Deskripsi & Brief:</span>
                  <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-700 leading-relaxed max-h-32 overflow-y-auto">
                    {selectedTask.deskripsi}
                  </p>
                </div>
              )}

              {/* Assignees */}
              <div>
                <span className="font-medium text-slate-500 block mb-1.5">Staf Penanggung Jawab:</span>
                <div className="flex flex-wrap gap-2">
                  {(selectedTask.assignees || []).map((a) => (
                    <div
                      key={a.id}
                      className="inline-flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-full text-slate-800 font-medium"
                    >
                      <Avatar
                        src={a.profile?.foto}
                        fallback={a.profile?.nama || 'U'}
                        alt={a.profile?.nama || 'U'}
                        size="sm"
                        className="h-5 w-5"
                      />
                      <span>{a.profile?.nama}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <DialogClose asChild>
                <Button variant="outline" size="sm">
                  Tutup
                </Button>
              </DialogClose>
              <Button asChild size="sm" className="gap-1.5">
                <Link
                  href={
                    role === 'admin'
                      ? `/admin/tugas/${selectedTask.id}`
                      : role === 'sosmed'
                      ? `/sosmed/tugas/${selectedTask.id}`
                      : role === 'pep'
                      ? `/pep/tugas/${selectedTask.id}`
                      : `/pegawai/tugas/${selectedTask.id}`
                  }
                >
                  Buka Halaman Lengkap
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </DialogFooter>
          </div>
        )}
      </Dialog>
    </div>
  );
}
