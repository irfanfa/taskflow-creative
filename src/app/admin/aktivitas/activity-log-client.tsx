'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import type { Profile } from '@/types/database';
import { getGlobalActivities } from '@/app/actions/productivity';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Search, ExternalLink, Loader2, X } from 'lucide-react';

interface ActivityLogClientProps {
  initialActivities: any[];
  employees: Profile[];
  initialUserId?: string;
  initialActionType?: string;
  initialStartDate?: string;
  initialEndDate?: string;
  initialQuery?: string;
}

interface ActionMeta {
  label: string;
  badgeClass: string;
}

function getActionMeta(actionType: string): ActionMeta {
  switch (actionType) {
    case 'review_approved':
      return {
        label: 'Persetujuan Selesai',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
      };
    case 'review_revision':
      return {
        label: 'Permintaan Revisi',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
      };
    case 'submit_review':
      return {
        label: 'Penyerahan Hasil',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
      };
    case 'task_posted':
      return {
        label: 'Tayang Medsos',
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
      };
    case 'task_post_cancelled':
      return {
        label: 'Batal Tayang',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
      };
    case 'timer_started':
      return {
        label: 'Timer Dimulai',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
      };
    case 'timer_stopped':
    case 'timer_auto_stopped':
      return {
        label: 'Timer Dihentikan',
        badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
      };
    case 'time_logged_manual':
      return {
        label: 'Waktu Manual',
        badgeClass: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
      };
    case 'subtask_created':
      return {
        label: 'Checklist Dibuat',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
      };
    case 'subtask_toggled':
      return {
        label: 'Checklist Selesai',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
      };
    case 'attachment_uploaded':
      return {
        label: 'Unggah Lampiran',
        badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
      };
    case 'attachment_deleted':
      return {
        label: 'Hapus Lampiran',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };
    case 'comment_added':
      return {
        label: 'Komentar Diskusi',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };
    case 'task_created_recurring':
      return {
        label: 'Tugas Berulang',
        badgeClass: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
      };
    default:
      return {
        label: 'Aktivitas',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      };
  }
}

function formatWIB(dateStr: string) {
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

function formatRelativeTime(dateStr: string) {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays === 1) return 'Kemarin';
    if (diffDays < 7) return `${diffDays} hari lalu`;
    return null;
  } catch {
    return null;
  }
}

export function ActivityLogClient({
  initialActivities,
  employees,
  initialUserId = 'Semua',
  initialActionType = 'Semua',
  initialStartDate = '',
  initialEndDate = '',
  initialQuery = '',
}: ActivityLogClientProps) {
  const [activities, setActivities] = useState(initialActivities);
  const [userId, setUserId] = useState(initialUserId);
  const [actionType, setActionType] = useState(initialActionType);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [query, setQuery] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();

  const handleApplyFilter = (customParams?: {
    userId?: string;
    actionType?: string;
    startDate?: string;
    endDate?: string;
    query?: string;
  }) => {
    const targetUserId = customParams?.userId !== undefined ? customParams.userId : userId;
    const targetActionType = customParams?.actionType !== undefined ? customParams.actionType : actionType;
    const targetStartDate = customParams?.startDate !== undefined ? customParams.startDate : startDate;
    const targetEndDate = customParams?.endDate !== undefined ? customParams.endDate : endDate;
    const targetQuery = customParams?.query !== undefined ? customParams.query : query;

    startTransition(async () => {
      const data = await getGlobalActivities({
        userId: targetUserId !== 'Semua' ? targetUserId : undefined,
        actionType: targetActionType !== 'Semua' ? targetActionType : undefined,
        startDate: targetStartDate || undefined,
        endDate: targetEndDate || undefined,
        query: targetQuery.trim() || undefined,
      });
      setActivities(data);
    });
  };

  const handleResetFilter = () => {
    setUserId('Semua');
    setActionType('Semua');
    setStartDate('');
    setEndDate('');
    setQuery('');
    startTransition(async () => {
      const data = await getGlobalActivities({});
      setActivities(data);
    });
  };

  const hasActiveFilters = Boolean(
    query.trim() ||
    userId !== 'Semua' ||
    actionType !== 'Semua' ||
    startDate ||
    endDate
  );

  const selectedEmployee = employees.find((e) => e.id === userId);
  const selectedActionMeta = actionType !== 'Semua' ? getActionMeta(actionType) : null;

  return (
    <div className="space-y-6">
      {/* Page Header (Clean typography without icons) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Log Aktivitas Global
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Linimasa audit trail seluruh perubahan status, revisi, checklist, lampiran, publikasi, dan timer kerja
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-600 dark:text-slate-300 shadow-2xs">
            Total: <strong className="text-slate-900 dark:text-white font-bold">{activities.length}</strong> aktivitas
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleApplyFilter()}
            disabled={isPending}
            className="h-8 px-3 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-xl"
            title="Segarkan data aktivitas terbaru"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            <span>Segarkan</span>
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Top Bar: Search Bar & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Cari deskripsi aktivitas, judul tugas, klien, atau pelaku..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                className="h-10 pl-10 pr-9 text-xs sm:text-sm bg-slate-50/80 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  title="Hapus teks pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                onClick={() => handleApplyFilter()}
                disabled={isPending}
                className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                <span>Terapkan Filter</span>
              </Button>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetFilter}
                  disabled={isPending}
                  className="h-10 px-4 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white border-slate-200 dark:border-slate-800 rounded-xl"
                  title="Reset semua filter ke kondisi awal"
                >
                  <span>Reset</span>
                </Button>
              )}
            </div>
          </div>

          {/* Bottom Bar: Parameter Selectors Grid (Clean text labels without icons) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
            {/* 1. Pelaku / User */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Pelaku / Pengguna
              </label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="Semua">Semua Pelaku / User</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.nama} ({emp.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Jenis Aktivitas */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Jenis Aktivitas
              </label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="Semua">Semua Jenis Aktivitas</option>
                <optgroup label="Alur Review & Persetujuan">
                  <option value="review_approved">Persetujuan Review (Selesai)</option>
                  <option value="review_revision">Permintaan Revisi</option>
                  <option value="submit_review">Penyerahan Hasil Kerja</option>
                </optgroup>
                <optgroup label="Publikasi Media Sosial">
                  <option value="task_posted">Dipublikasikan ke Medsos</option>
                  <option value="task_post_cancelled">Pembatalan Status Tayang</option>
                </optgroup>
                <optgroup label="Pengerjaan & Timer">
                  <option value="timer_started">Timer Kerja Dimulai</option>
                  <option value="timer_stopped">Timer Dihentikan</option>
                  <option value="time_logged_manual">Pencatatan Waktu Manual</option>
                </optgroup>
                <optgroup label="Kolaborasi & Dokumen">
                  <option value="subtask_created">Checklist Baru Dibuat</option>
                  <option value="subtask_toggled">Checklist Selesai</option>
                  <option value="attachment_uploaded">Lampiran Diunggah</option>
                  <option value="attachment_deleted">Lampiran Dihapus</option>
                  <option value="comment_added">Komentar Diskusi</option>
                  <option value="task_created_recurring">Tugas Berulang Otomatis</option>
                </optgroup>
              </select>
            </div>

            {/* 3. Rentang Tanggal */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>Rentang Tanggal</span>
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      handleApplyFilter({ startDate: '', endDate: '' });
                    }}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-semibold hover:underline capitalize"
                  >
                    Hapus Tanggal
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-[120px]">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                    title="Tanggal Mulai"
                  />
                </div>
                <span className="text-slate-400 dark:text-slate-500 text-xs font-bold shrink-0">s/d</span>
                <div className="relative flex-1 min-w-[120px]">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-10 px-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                    title="Tanggal Akhir"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
                Filter Aktif:
              </span>

              {query.trim() && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-900/60 font-medium">
                  <span>Kata Kunci: &ldquo;{query}&rdquo;</span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      handleApplyFilter({ query: '' });
                    }}
                    className="hover:text-indigo-900 dark:hover:text-white"
                    title="Hapus filter kata kunci"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {userId !== 'Semua' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-900/60 font-medium">
                  <span>Pelaku: {selectedEmployee?.nama || userId}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setUserId('Semua');
                      handleApplyFilter({ userId: 'Semua' });
                    }}
                    className="hover:text-indigo-900 dark:hover:text-white"
                    title="Hapus filter pelaku"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {actionType !== 'Semua' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-900/60 font-medium">
                  <span>Aksi: {selectedActionMeta?.label || actionType}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActionType('Semua');
                      handleApplyFilter({ actionType: 'Semua' });
                    }}
                    className="hover:text-indigo-900 dark:hover:text-white"
                    title="Hapus filter jenis aksi"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {(startDate || endDate) && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-900/60 font-medium">
                  <span>Periode: {startDate || 'Awal'} s/d {endDate || 'Sekarang'}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('');
                      setEndDate('');
                      handleApplyFilter({ startDate: '', endDate: '' });
                    }}
                    className="hover:text-indigo-900 dark:hover:text-white"
                    title="Hapus filter periode tanggal"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilter}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold hover:underline ml-1"
              >
                Hapus Semua
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activities Timeline Feed */}
      <Card className="border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          {activities.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400 space-y-2">
              <p className="font-bold text-sm text-slate-700 dark:text-slate-200">
                Tidak ada riwayat aktivitas ditemukan
              </p>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                Coba sesuaikan kata kunci pencarian, pilihan pelaku, atau rentang tanggal filter Anda.
              </p>
              {hasActiveFilters && (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilter}
                    className="text-xs h-8"
                  >
                    Reset Semua Filter
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="relative pl-5 sm:pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200/80 dark:before:bg-slate-800">
              {activities.map((act) => {
                const dateWIB = formatWIB(act.created_at);
                const relativeTime = formatRelativeTime(act.created_at);
                const actionMeta = getActionMeta(act.action_type);

                return (
                  <div key={act.id} className="relative group">
                    {/* Clean small dot marker on timeline spine */}
                    <div className="absolute -left-5 sm:-left-6 top-3 w-4.5 h-4.5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 flex items-center justify-center shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    </div>

                    {/* Activity Card */}
                    <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-indigo-200 dark:hover:border-indigo-500/40 hover:shadow-xs transition-all text-xs space-y-2">
                      {/* Top Bar: User info + Action Badge + Timestamp */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            className="w-7 h-7 text-[10px]"
                            src={act.user?.foto || undefined}
                            fallback={(act.user?.nama || 'U').substring(0, 2).toUpperCase()}
                            alt={act.user?.nama || 'Pengguna'}
                          />
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {act.user?.nama || 'Sistem / Administrator'}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase">
                              {act.user?.role || 'sistem'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${actionMeta.badgeClass}`}>
                            {actionMeta.label}
                          </span>

                          <span className="text-[11px] text-slate-400 dark:text-slate-400 font-mono hidden sm:inline" title={dateWIB}>
                            {relativeTime ? `${relativeTime} (${dateWIB})` : dateWIB}
                          </span>
                        </div>
                      </div>

                      {/* Description Text */}
                      <div className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                        {act.description}
                      </div>

                      {/* Associated Task Link Box */}
                      {act.task && (
                        <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="text-slate-400 dark:text-slate-500 font-medium">
                            Tugas Terkait:
                          </span>
                          <Link
                            href={`/admin/tugas/${act.task.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 font-semibold transition-colors group/task"
                          >
                            <span className="group-hover/task:underline">{act.task.judul}</span>
                            <span className="text-indigo-500 dark:text-indigo-400 font-normal">
                              &bull; {act.task.klien_proyek}
                            </span>
                            <ExternalLink className="w-3 h-3 text-indigo-400 group-hover/task:translate-x-0.5 transition-transform" />
                          </Link>
                        </div>
                      )}

                      {/* Mobile Timestamp */}
                      <div className="sm:hidden text-[10px] text-slate-400 font-mono">
                        {dateWIB}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
