'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import type { TaskWithAssignees, Profile } from '@/types/database';
import { markTaskAsPosted, unmarkTaskAsPosted } from '@/app/actions/tasks';
import { isHolidayTask } from '@/lib/tasks/holiday-helper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { PriorityBadge } from '@/components/tasks/priority-badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Send,
  Share2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  Loader2,
  RotateCcw,
  Globe,
  FileCheck2,
  Info,
  CalendarDays,
} from 'lucide-react';

interface SosmedPostingClientProps {
  initialTasks: TaskWithAssignees[];
  currentProfile: Profile;
  needsMigration?: boolean;
}

export function SosmedPostingClient({
  initialTasks,
  currentProfile,
  needsMigration = false,
}: SosmedPostingClientProps) {
  const [tasks, setTasks] = useState<TaskWithAssignees[]>(initialTasks);
  const [activeTab, setActiveTab] = useState<'Semua' | 'Siap Diposting' | 'Sudah Diposting' | 'Hari Besar'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Posting Action Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithAssignees | null>(null);
  const [linkPosting, setLinkPosting] = useState('');
  const [catatanPosting, setCatatanPosting] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Unmark state
  const [isUnmarking, setIsUnmarking] = useState<string | null>(null);

  // Sync state if props change
  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Metrik Penghitungan
  const stats = useMemo(() => {
    const total = tasks.length;
    const siap = tasks.filter((t) => t.status_posting !== 'sudah_diposting').length;
    const sudah = tasks.filter((t) => t.status_posting === 'sudah_diposting').length;
    const hariBesar = tasks.filter((t) => isHolidayTask(t)).length;

    return { total, siap, sudah, hariBesar };
  }, [tasks]);

  // Filter Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Tab filter
      if (activeTab === 'Siap Diposting' && task.status_posting === 'sudah_diposting') return false;
      if (activeTab === 'Sudah Diposting' && task.status_posting !== 'sudah_diposting') return false;
      if (activeTab === 'Hari Besar') {
        if (!isHolidayTask(task)) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = task.judul.toLowerCase().includes(q);
        const matchKlien = task.klien_proyek.toLowerCase().includes(q);
        const matchJenis = task.jenis_pekerjaan.toLowerCase().includes(q);
        const matchDeskripsi = (task.deskripsi || '').toLowerCase().includes(q);
        return matchTitle || matchKlien || matchJenis || matchDeskripsi;
      }

      return true;
    });
  }, [tasks, activeTab, searchQuery]);

  // Open Posting Modal
  const handleOpenPostingModal = (task: TaskWithAssignees) => {
    setSelectedTask(task);
    setLinkPosting(task.link_posting || '');
    setCatatanPosting(task.catatan_posting || '');
    setFeedbackError(null);
    setIsModalOpen(true);
  };

  // Submit Mark as Posted
  const handleSubmitPosted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    setIsSubmitting(true);
    setFeedbackError(null);

    const res = await markTaskAsPosted({
      taskId: selectedTask.id,
      link_posting: linkPosting.trim() || undefined,
      catatan_posting: catatanPosting.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id
            ? {
                ...t,
                status_posting: 'sudah_diposting',
                link_posting: linkPosting.trim() || null,
                catatan_posting: catatanPosting.trim() || null,
                posted_at: new Date().toISOString(),
                posted_by: currentProfile.id,
              }
            : t
        )
      );
      setIsModalOpen(false);
      setFeedbackSuccess(`Karya "${selectedTask.judul}" berhasil ditandai telah diposting!`);
      setTimeout(() => setFeedbackSuccess(null), 4000);
    } else {
      setFeedbackError(res.error || 'Gagal memperbarui status posting.');
    }
  };

  // Unmark / Kembalikan ke Antrean
  const handleUnmarkPosted = async (task: TaskWithAssignees) => {
    if (!confirm(`Kembalikan postingan "${task.judul}" ke status "Siap Diposting"?`)) {
      return;
    }

    setIsUnmarking(task.id);
    const res = await unmarkTaskAsPosted(task.id);
    setIsUnmarking(null);

    if (res.success) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status_posting: 'menunggu_posting',
                posted_at: null,
              }
            : t
        )
      );
      setFeedbackSuccess(`Status posting "${task.judul}" dikembalikan ke antrean.`);
      setTimeout(() => setFeedbackSuccess(null), 4000);
    } else {
      setFeedbackError(res.error || 'Gagal mengembalikan status posting.');
    }
  };

  // Format Date WIB
  const formatWIB = (iso?: string | null) => {
    if (!iso) return '-';
    try {
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
      }).format(new Date(iso)) + ' WIB';
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Halaman Tugas Posting */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Panel Pengelola Sosmed
            </span>
            <span className="text-slate-300 dark:text-slate-700">&bull;</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">WIB (UTC+7)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Tugas Posting
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Materi desain dan video final yang telah selesai disetujui, siap dipublikasikan ke kanal resmi media sosial.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="text-xs py-1 px-3 font-medium border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            Publikasi Konten
          </Badge>
        </div>
      </div>

      {/* Global Alerts */}
      {needsMigration && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm animate-in fade-in-50 flex items-start gap-3 shadow-xs">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-950 dark:text-amber-100">
              Sinkronisasi Skema Database Supabase
            </p>
            <p className="text-xs text-amber-800/90 dark:text-amber-300 leading-relaxed">
              Kolom integrasi posting media sosial (<code>perlu_upload_sosmed</code>, <code>status_posting</code>, dll.) belum terpasang di database Supabase. Sistem saat ini berjalan dalam mode <em>fallback</em> (menampilkan seluruh tugas berstatus Selesai). Agar riwayat link posting dapat tersimpan permanen di database, jalankan skrip SQL di <code>supabase/migrations/20261025000002_add_perlu_upload_sosmed.sql</code> pada menu <strong>SQL Editor</strong> dashboard Supabase Anda.
            </p>
          </div>
        </div>
      )}

      {feedbackSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-medium animate-in fade-in-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{feedbackSuccess}</span>
          </div>
        </div>
      )}
      {feedbackError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-sm font-medium animate-in fade-in-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{feedbackError}</span>
          </div>
        </div>
      )}

      {/* 4 Kartu Metrik Posting */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Siap Diposting */}
        <Card
          onClick={() => setActiveTab('Siap Diposting')}
          className={`border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer transition-colors ${
            activeTab === 'Siap Diposting' ? 'ring-2 ring-indigo-500 border-transparent' : 'hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <CardHeader className="pb-1 p-3.5 sm:p-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Siap Diposting
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {stats.siap}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Menunggu publikasi</p>
          </CardContent>
        </Card>

        {/* Card 2: Sudah Diposting */}
        <Card
          onClick={() => setActiveTab('Sudah Diposting')}
          className={`border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer transition-colors ${
            activeTab === 'Sudah Diposting' ? 'ring-2 ring-emerald-500 border-transparent' : 'hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <CardHeader className="pb-1 p-3.5 sm:p-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Sudah Diposting
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.sudah}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Tayang di media sosial</p>
          </CardContent>
        </Card>

        {/* Card 3: Hari Besar Nasional */}
        <Card
          onClick={() => setActiveTab('Hari Besar')}
          className={`border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer transition-colors ${
            activeTab === 'Hari Besar' ? 'ring-2 ring-amber-500 border-transparent' : 'hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <CardHeader className="pb-1 p-3.5 sm:p-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Hari Besar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {stats.hariBesar}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">E-Flyer &amp; Peringatan</p>
          </CardContent>
        </Card>

        {/* Card 4: Total Konten Sosmed */}
        <Card
          onClick={() => setActiveTab('Semua')}
          className={`border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer transition-colors ${
            activeTab === 'Semua' ? 'ring-2 ring-slate-600 border-transparent' : 'hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <CardHeader className="pb-1 p-3.5 sm:p-5">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Konten
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {stats.total}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Semua alur posting</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Panel Content Container */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 rounded-xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Antrean Tugas Posting ({filteredTasks.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Karya selesai yang ditandai untuk diposting ke media sosial oleh Ketua Tim atau PEP.
              </CardDescription>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Search Bar */}
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari tugas posting..."
                  className="pl-9 h-9 text-xs w-full sm:w-56"
                />
              </div>

              {/* Tabs */}
              <div className="inline-flex rounded-xl bg-slate-100/70 dark:bg-slate-900/70 p-1 border border-slate-200 dark:border-slate-800 shrink-0">
                {(['Semua', 'Siap Diposting', 'Sudah Diposting', 'Hari Besar'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      activeTab === tab
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6">
          {filteredTasks.length === 0 ? (
            <div className="py-16 text-center max-w-md mx-auto space-y-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {searchQuery
                  ? 'Tidak Ada Konten yang Cocok'
                  : activeTab === 'Siap Diposting'
                  ? 'Semua Konten Telah Diposting'
                  : activeTab === 'Sudah Diposting'
                  ? 'Belum Ada Konten yang Ditandai Selesai Diposting'
                  : 'Belum Ada Antrean Tugas Posting'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {searchQuery
                  ? `Tidak ditemukan hasil pencarian untuk kata kunci "${searchQuery}". Coba kata kunci lain.`
                  : 'Ketika tugas baru dibuat oleh Admin atau PEP dengan opsi "Publikasikan Konten ke Media Sosial" dicentang dan tugas tersebut telah disetujui (Selesai), materi akan otomatis muncul di halaman ini.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTasks.map((task) => {
                const isPosted = task.status_posting === 'sudah_diposting';
                const isHariBesar = isHolidayTask(task);

                return (
                  <Card
                    key={task.id}
                    className={`border transition-colors flex flex-col justify-between ${
                      isPosted
                        ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="p-4 sm:p-5 space-y-3.5">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">
                            {task.jenis_pekerjaan}
                          </span>
                          {isHariBesar && (
                            <span className="font-semibold text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                              Hari Besar
                            </span>
                          )}
                          <PriorityBadge prioritas={task.prioritas} />
                        </div>

                        {/* Status Posting Badge */}
                        {isPosted ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Sudah Diposting
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            Siap Diposting
                          </span>
                        )}
                      </div>

                      {/* Judul & Detail Link */}
                      <div>
                        <Link
                          href={`/sosmed/tugas/${task.id}`}
                          className="font-bold text-base text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2 transition-colors"
                        >
                          {task.judul}
                        </Link>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                          <span>Klien: <strong className="text-slate-700 dark:text-slate-300">{task.klien_proyek}</strong></span>
                          <span>&bull;</span>
                          <span>Batas Waktu: {formatWIB(task.deadline)}</span>
                        </div>
                      </div>

                      {/* Tautan Hasil Akhir (Materi Siap Upload) */}
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                          <span>
                            Hasil Akhir Materi Visual
                          </span>
                          {task.link_hasil ? (
                            <a
                              href={task.link_hasil}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                            >
                              Buka File
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-normal">Belum ada link hasil</span>
                          )}
                        </div>
                        {task.link_hasil ? (
                          <div className="text-xs text-slate-700 dark:text-slate-300 truncate font-mono">
                            {task.link_hasil}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 italic">
                            Tugas telah disetujui (Selesai). Periksa detail tugas jika hasil dilampirkan via deskripsi/diskusi.
                          </div>
                        )}
                      </div>

                      {/* Info Postingan jika sudah diposting */}
                      {isPosted && (
                        <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs space-y-1.5">
                          <div className="flex items-center justify-between font-semibold text-emerald-900 dark:text-emerald-200">
                            <span>
                              Tayang pada: {formatWIB(task.posted_at)}
                            </span>
                            {task.link_posting && (
                              <a
                                href={task.link_posting}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 hover:underline"
                              >
                                Lihat Postingan
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          {task.catatan_posting && (
                            <p className="text-slate-700 dark:text-slate-300 italic">
                              &ldquo;{task.catatan_posting}&rdquo;
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex items-center justify-between gap-2">
                      <Button asChild variant="ghost" size="sm" className="text-xs text-slate-600 hover:text-slate-900">
                        <Link href={`/sosmed/tugas/${task.id}`}>
                          Lihat Detail
                        </Link>
                      </Button>

                      <div className="flex items-center gap-2">
                        {isPosted ? (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnmarkPosted(task)}
                              disabled={isUnmarking === task.id}
                              className="text-xs text-slate-600 hover:text-rose-600 border-slate-200 dark:border-slate-700 h-8"
                            >
                              {isUnmarking === task.id && (
                                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                              )}
                              <span>Batalkan</span>
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleOpenPostingModal(task)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-medium"
                            >
                              Edit Link
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleOpenPostingModal(task)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 font-medium shadow-xs"
                          >
                            Tandai Sudah Diposting
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL TANDAI SUDAH DIPOSTING */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSubmitPosted} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Konfirmasi Publikasi Media Sosial
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Tandai bahwa materi karya <strong className="text-slate-800 dark:text-slate-200">{selectedTask?.judul}</strong> telah berhasil ditayangkan di kanal sosial media resmi.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-1">
              {/* Tautan Postingan */}
              <div className="space-y-1.5">
                <Label htmlFor="linkPosting" className="text-xs font-semibold">
                  Tautan / Link Postingan (Instagram, TikTok, YouTube, dll)
                </Label>
                <Input
                  id="linkPosting"
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
                <Label htmlFor="catatanPosting" className="text-xs font-semibold">
                  Keterangan Publikasi / Platform
                </Label>
                <Input
                  id="catatanPosting"
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
                    Menyimpan...
                  </>
                ) : (
                  'Simpan & Tandai Tayang'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
