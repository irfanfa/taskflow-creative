'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import type { TaskWithAssignees, Profile, TaskStatus, TaskPriority } from '@/types/database';
import { StatusBadge } from '@/components/tasks/status-badge';
import { PriorityBadge } from '@/components/tasks/priority-badge';
import { DeadlineIndicator } from '@/components/tasks/deadline-indicator';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTasksListRealtime } from '@/hooks/use-task-realtime';

interface PepDashboardClientProps {
  initialTasks: TaskWithAssignees[];
  currentProfile: Profile;
}

export function PepDashboardClient({
  initialTasks,
  currentProfile,
}: PepDashboardClientProps) {
  const [tasks, setTasks] = useState<TaskWithAssignees[]>(initialTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Realtime Live-Sync: sinkronisasi otomatis saat ada hasil kerja diserahkan oleh tim KMB
  useTasksListRealtime({
    channelName: `pep-dashboard-live-${currentProfile.id}`,
  });

  // Metrik Tugas milik PEP
  const metrics = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === 'Sedang Dikerjakan').length;
    const waitingReview = tasks.filter((t) => t.status === 'Menunggu Review').length;
    const revision = tasks.filter((t) => t.status === 'Revisi').length;
    const completed = tasks.filter((t) => t.status === 'Selesai').length;

    return { total, inProgress, waitingReview, revision, completed };
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        t.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.klien_proyek.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.jenis_pekerjaan.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'Dalam Antrean' || statusFilter === 'Belum Dimulai'
          ? t.status === 'Dalam Antrean' || t.status === 'Belum Dimulai'
          : t.status === statusFilter;
      const matchPriority = priorityFilter === 'all' || t.prioritas === priorityFilter;

      return matchSearch && matchStatus && matchPriority;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Banner Utama PEP */}
      <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-500/10 dark:bg-amber-950/30 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
              <span>Portal Khusus PEP (Siaran)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              Dashboard Tugas Siaran
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Buat penugasan baru untuk <strong>Pegawai (KMB)</strong>, pantau progres pengerjaan,
              serta setujui atau minta revisi hasil kerja secara langsung tanpa persetujuan Ketua Tim.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Link href="/pep/tugas/baru">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm border border-amber-500 h-11 px-5">
                <span>Buat Tugas Baru</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Alert Khusus jika ada tugas Menunggu Review PEP */}
      {metrics.waitingReview > 0 && (
        <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 dark:text-amber-200">
          <div>
            <p className="font-bold text-sm">
              Ada {metrics.waitingReview} tugas menunggu review Anda!
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Pegawai (KMB) telah menyerahkan hasil pengerjaan. Silakan periksa hasil dan putuskan Setujui atau Minta Revisi.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setStatusFilter('Menunggu Review')}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs shrink-0"
          >
            Filter Menunggu Review
          </Button>
        </div>
      )}

      {/* 4 Kartu Ringkasan Tugas PEP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tugas */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Tugas Saya</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{metrics.total}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Sedang Dikerjakan */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">Sedang Dikerjakan</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{metrics.inProgress}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Menunggu Review */}
        <Card
          onClick={() => setStatusFilter('Menunggu Review')}
          className="border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs cursor-pointer hover:border-amber-400 transition-colors"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Menunggu Review</p>
              <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">{metrics.waitingReview}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
              <AlertCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Selesai */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Selesai</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{metrics.completed}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Kontrol Pencarian */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari tugas siaran berdasarkan judul atau klien..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="Dalam Antrean">Dalam Antrean</option>
              <option value="Sedang Dikerjakan">Sedang Dikerjakan</option>
              <option value="Menunggu Review">Menunggu Review</option>
              <option value="Revisi">Revisi</option>
              <option value="Selesai">Selesai</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Semua Prioritas</option>
              <option value="Rendah">Rendah</option>
              <option value="Sedang">Sedang</option>
              <option value="Tinggi">Tinggi</option>
              <option value="Urgent">Urgent</option>
            </select>

            {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                }}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Reset Filter
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Daftar Tugas Milik PEP */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white/50 dark:bg-slate-900/40">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Tidak ada tugas ditemukan
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            {tasks.length === 0
              ? 'Anda belum pernah membuat tugas siaran. Klik tombol di bawah untuk membuat tugas pertama Anda.'
              : 'Tidak ada tugas yang cocok dengan filter pencarian Anda.'}
          </p>
          <Link href="/pep/tugas/baru">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5">
              <PlusCircle className="w-3.5 h-3.5" />
              Buat Tugas Baru
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'Selesai';
            const subtotal = task.subtasks_total || 0;
            const subdone = task.subtasks_completed || 0;
            const subPercent = subtotal > 0 ? Math.round((subdone / subtotal) * 100) : 0;

            return (
              <Card
                key={task.id}
                className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header: Jenis & Status */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/70 px-2.5 py-0.5 rounded-md border border-amber-200/80 dark:border-amber-900/60">
                        {task.jenis_pekerjaan}
                      </span>
                      <StatusBadge status={task.status} />
                    </div>

                    {/* Judul & Klien */}
                    <Link
                      href={`/pep/tugas/${task.id}`}
                      className="group block"
                    >
                      <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 group-hover:text-amber-600 transition-colors line-clamp-2">
                        {task.judul}
                      </h3>
                    </Link>

                    {/* Subtasks Progress */}
                    {subtotal > 0 && (
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span>Checklist Subtask</span>
                          <span className="font-semibold">{subdone}/{subtotal} ({subPercent}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full transition-all"
                            style={{ width: `${subPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Info: Priority & Deadline */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <PriorityBadge prioritas={task.prioritas} />
                      <DeadlineIndicator deadline={task.deadline} isCompleted={isCompleted} />
                    </div>

                    {/* Assigned to: Pegawai (KMB) */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400">Ditugaskan ke:</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                        Pegawai (KMB)
                      </span>
                    </div>

                    {/* Action button: Review or View */}
                    <div className="pt-1">
                      {task.status === 'Menunggu Review' ? (
                        <Link href={`/pep/tugas/${task.id}`} className="block">
                          <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold">
                            Review Hasil Kerja Ini
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/pep/tugas/${task.id}`} className="block">
                          <Button variant="outline" size="sm" className="w-full text-xs gap-1 text-slate-700 dark:text-slate-200">
                            Lihat Detail & Riwayat
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
