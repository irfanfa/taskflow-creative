'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { TaskWithAssignees } from '@/types/database';
import { restoreTask, permanentDeleteTask, emptyTrashAction } from '@/app/actions/tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Trash2,
  RotateCcw,
  Search,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Layers,
  Archive,
} from 'lucide-react';

interface TrashClientProps {
  initialTasks: TaskWithAssignees[];
}

export function TrashClient({ initialTasks }: TrashClientProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithAssignees[]>(initialTasks);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog & Action State
  const [taskToRestore, setTaskToRestore] = useState<TaskWithAssignees | null>(null);
  const [taskToPermanentlyDelete, setTaskToPermanentlyDelete] = useState<TaskWithAssignees | null>(null);
  const [emptyTrashDialogOpen, setEmptyTrashDialogOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filter tasks berdasarkan query pencarian
  const filteredTasks = tasks.filter((task) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      task.judul.toLowerCase().includes(q) ||
      task.klien_proyek.toLowerCase().includes(q) ||
      task.jenis_pekerjaan.toLowerCase().includes(q)
    );
  });

  // Handler Pulihkan Tugas (Restore)
  const handleRestore = async () => {
    if (!taskToRestore) return;
    setIsLoading(true);
    setActionError(null);
    setActionSuccess(null);

    const res = await restoreTask(taskToRestore.id);
    setIsLoading(false);

    if (res.success) {
      setTasks((prev) => prev.filter((t) => t.id !== taskToRestore.id));
      setActionSuccess(`Tugas "${taskToRestore.judul}" berhasil dipulihkan ke daftar tugas aktif.`);
      setTaskToRestore(null);
      setTimeout(() => setActionSuccess(null), 5000);
      router.refresh();
    } else {
      setActionError(res.error || 'Gagal memulihkan tugas.');
    }
  };

  // Handler Hapus Permanen 1 Tugas (Hard Delete)
  const handlePermanentDelete = async () => {
    if (!taskToPermanentlyDelete) return;
    setIsLoading(true);
    setActionError(null);
    setActionSuccess(null);

    const res = await permanentDeleteTask(taskToPermanentlyDelete.id);
    setIsLoading(false);

    if (res.success) {
      setTasks((prev) => prev.filter((t) => t.id !== taskToPermanentlyDelete.id));
      setActionSuccess(`Tugas "${taskToPermanentlyDelete.judul}" telah dihapus permanen dari database.`);
      setTaskToPermanentlyDelete(null);
      setTimeout(() => setActionSuccess(null), 5000);
      router.refresh();
    } else {
      setActionError(res.error || 'Gagal menghapus tugas permanen.');
    }
  };

  // Handler Kosongkan Seluruh Tempat Sampah
  const handleEmptyTrash = async () => {
    setIsLoading(true);
    setActionError(null);
    setActionSuccess(null);

    const res = await emptyTrashAction();
    setIsLoading(false);

    if (res.success) {
      setTasks([]);
      setEmptyTrashDialogOpen(false);
      setActionSuccess(`Seluruh tempat sampah (${res.count || 0} tugas) telah berhasil dikosongkan secara permanen.`);
      setTimeout(() => setActionSuccess(null), 5000);
      router.refresh();
    } else {
      setActionError(res.error || 'Gagal mengosongkan tempat sampah.');
    }
  };

  const formatDeletedDate = (isoString?: string | null) => {
    if (!isoString) return '-';
    try {
      return (
        new Intl.DateTimeFormat('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jakarta',
        }).format(new Date(isoString)) + ' WIB'
      );
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-slate-600 hover:text-slate-900">
          <Link href="/admin/tugas">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Manajemen Tugas Aktif
          </Link>
        </Button>
      </div>

      {/* Main Header Card */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Arsip &amp; Tempat Sampah Tugas
            </h1>
            <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-bold">
              {tasks.length} Tugas
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Daftar tugas yang telah dihapus (*soft delete*). Anda dapat <strong>memulihkan tugas</strong> kembali ke
            daftar aktif sewaktu-waktu, atau <strong>menghapusnya secara permanen</strong> dari database Supabase.
          </p>
        </div>

        {tasks.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEmptyTrashDialogOpen(true)}
            disabled={isLoading}
            className="text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-semibold self-start md:self-auto shrink-0 shadow-2xs"
          >
            <span>Kosongkan Sampah</span>
          </Button>
        )}
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

      {/* Search Input Bar */}
      {tasks.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari tugas di arsip berdasarkan judul, klien, atau kategori..."
            className="pl-10 h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm shadow-xs"
          />
        </div>
      )}

      {/* Main List Table / Cards */}
      {tasks.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-12">
            <EmptyState
              icon={Archive}
              title="Tempat Sampah Bersih"
              description="Tidak ada tugas di dalam arsip saat ini. Semua tugas aktif tersimpan rapi dan dapat dipantau di halaman utama."
              actionText="Kembali ke Manajemen Tugas"
              onAction={() => router.push('/admin/tugas')}
            />
          </CardContent>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-8 text-center text-sm text-slate-500">
            Tidak ada tugas di arsip yang cocok dengan kata kunci &quot;{searchQuery}&quot;.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Tugas &amp; Klien</th>
                  <th className="py-3.5 px-4">Kategori / Jenis</th>
                  <th className="py-3.5 px-4">Prioritas</th>
                  <th className="py-3.5 px-4">Pelaksana (PJ)</th>
                  <th className="py-3.5 px-4">Waktu Dihapus</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Judul & Klien */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {task.judul}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Klien: <span className="font-medium text-slate-700 dark:text-slate-300">{task.klien_proyek}</span>
                      </div>
                    </td>

                    {/* Kategori */}
                    <td className="py-4 px-4">
                      <Badge variant="outline" className="font-medium text-xs bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                        <Layers className="h-3 w-3 mr-1 text-slate-400" />
                        {task.jenis_pekerjaan}
                      </Badge>
                    </td>

                    {/* Prioritas */}
                    <td className="py-4 px-4">
                      <Badge
                        className={`text-[11px] font-semibold border-0 ${
                          task.prioritas === 'Urgent'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : task.prioritas === 'Tinggi'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : task.prioritas === 'Sedang'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {task.prioritas}
                      </Badge>
                    </td>

                    {/* Pelaksana */}
                    <td className="py-4 px-4">
                      {task.assignees && task.assignees.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={task.assignees[0].profile?.foto}
                            fallback={task.assignees[0].profile?.nama || 'U'}
                            size="sm"
                          />
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px]">
                            {task.assignees[0].profile?.nama || 'Pegawai'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum ditugaskan</span>
                      )}
                    </td>

                    {/* Waktu Dihapus */}
                    <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{formatDeletedDate(task.deleted_at)}</span>
                      </div>
                    </td>

                    {/* Aksi */}
                    <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        {/* Tombol Pulihkan (Restore) */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTaskToRestore(task)}
                          disabled={isLoading}
                          className="gap-1.5 text-xs font-semibold border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 shadow-2xs"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Pulihkan</span>
                        </Button>

                        {/* Tombol Hapus Permanen */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTaskToPermanentlyDelete(task)}
                          disabled={isLoading}
                          className="gap-1.5 text-xs font-semibold border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 shadow-2xs"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Hapus Permanen</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Pulihkan (Restore) */}
      <Dialog open={!!taskToRestore} onOpenChange={(open) => !open && setTaskToRestore(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <RotateCcw className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold">Pulihkan Tugas dari Arsip?</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
              Tugas <strong className="text-slate-900 dark:text-slate-100">&quot;{taskToRestore?.judul}&quot;</strong> akan
              dikembalikan ke papan manajemen tugas aktif dan dapat kembali dikerjakan oleh tim.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTaskToRestore(null)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleRestore}
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Pulihkan Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Permanen (Single Hard Delete) */}
      <Dialog open={!!taskToPermanentlyDelete} onOpenChange={(open) => !open && setTaskToPermanentlyDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-rose-600 dark:text-rose-400">
                Hapus Tugas Secara Permanen?
              </DialogTitle>
            </div>
            <DialogDescription as="div" className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <p>
                Tugas <strong className="text-slate-900 dark:text-slate-100">&quot;{taskToPermanentlyDelete?.judul}&quot;</strong>{' '}
                akan dihapus <strong>selamanya dari database Supabase</strong> beserta seluruh lampiran, penugasan, dan riwayatnya.
              </p>
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Peringatan: Tindakan ini permanen dan tidak dapat dibatalkan atau dipulihkan kembali!</span>
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTaskToPermanentlyDelete(null)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handlePermanentDelete}
              disabled={isLoading}
              className="font-semibold gap-1.5"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Kosongkan Tempat Sampah (Bulk Hard Delete) */}
      <Dialog open={emptyTrashDialogOpen} onOpenChange={setEmptyTrashDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-rose-600 dark:text-rose-400">
                Kosongkan Seluruh Tempat Sampah?
              </DialogTitle>
            </div>
            <DialogDescription as="div" className="text-sm text-slate-600 dark:text-slate-400 space-y-2">
              <p>
                Anda akan menghapus permanen <strong>{tasks.length} tugas</strong> yang berada di arsip/sampah.
                Seluruh data baris di tabel database Supabase akan dibersihkan tuntas.
              </p>
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Peringatan: Seluruh data yang dihapus tidak akan dapat dipulihkan kembali.</span>
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEmptyTrashDialogOpen(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleEmptyTrash}
              disabled={isLoading}
              className="font-semibold gap-1.5"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Ya, Kosongkan Sampah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
