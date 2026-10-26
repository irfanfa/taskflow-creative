'use client';

import React, { useState } from 'react';
import type { TaskWithAssignees } from '@/types/database';
import { approveTask, requestTaskRevision } from '@/app/actions/collaboration';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  RotateCcw,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskReviewModalProps {
  task: TaskWithAssignees;
  onSuccess?: (newStatus?: 'Selesai' | 'Revisi') => void;
}

export function TaskReviewModal({ task, onSuccess }: TaskReviewModalProps) {
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [catatanRevisi, setCatatanRevisi] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isSubmitted = task.status === 'Menunggu Review';
  const isCompleted = task.status === 'Selesai';
  const canReview = isSubmitted;

  const handleApprove = async () => {
    if (!canReview) return;
    setIsLoading(true);
    setErrorMsg(null);
    const res = await approveTask({ taskId: task.id });
    setIsLoading(false);

    if (res.success) {
      setApproveDialogOpen(false);
      if (onSuccess) onSuccess('Selesai');
    } else {
      setErrorMsg(res.error || 'Gagal menyetujui tugas.');
    }
  };

  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canReview) return;
    if (!catatanRevisi.trim()) {
      setErrorMsg('Catatan revisi wajib diisi agar pegawai mengetahui poin perbaikan.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    const res = await requestTaskRevision({
      taskId: task.id,
      catatanRevisi: catatanRevisi.trim(),
    });
    setIsLoading(false);

    if (res.success) {
      setRevisionDialogOpen(false);
      setCatatanRevisi('');
      if (onSuccess) onSuccess('Revisi');
    } else {
      setErrorMsg(res.error || 'Gagal mengirim permintaan revisi.');
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 p-5 shadow-xs">
      {task.creator?.role === 'pep' && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200">
          <span>
            <strong>Tugas dibuat oleh PEP (Siaran)</strong>: Persetujuan review dan revisi tugas ini dikelola langsung oleh PEP. Ketua Tim tidak diwajibkan melakukan persetujuan.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300">
              {task.creator?.role === 'pep' ? 'Alur Review Tugas PEP' : 'Alur Review Ketua Tim'}
            </span>
            {task.revision_count !== undefined && task.revision_count > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <RotateCcw className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                Revisi ke-{task.revision_count}
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Tinjau & Validasi Kualitas Pekerjaan
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {task.creator?.role === 'pep'
              ? 'Tugas ini dapat disetujui atau direvisi langsung oleh PEP. Ketua Tim juga dapat mengambil tindakan bila diperlukan.'
              : 'Setujui pekerjaan jika sudah sesuai standar atau minta revisi dengan catatan spesifik untuk pegawai.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={!canReview || isLoading}
            onClick={() => {
              if (!canReview) return;
              setErrorMsg(null);
              setRevisionDialogOpen(true);
            }}
            className={cn(
              'border-amber-300 text-amber-800 hover:bg-amber-50 hover:text-amber-900 gap-1.5 font-medium transition-all',
              !canReview &&
                'opacity-45 cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800/60 dark:text-slate-500 dark:border-slate-700 pointer-events-none hover:bg-slate-100 hover:text-slate-400 shadow-none'
            )}
            title={!canReview ? 'Tombol nonaktif: Tugas belum dikirimkan oleh pegawai' : undefined}
          >
            Minta Revisi
          </Button>

          <Button
            type="button"
            disabled={!canReview || isLoading}
            onClick={() => {
              if (!canReview) return;
              setErrorMsg(null);
              setApproveDialogOpen(true);
            }}
            className={cn(
              'bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs transition-all',
              !canReview &&
                'opacity-45 cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500 pointer-events-none hover:bg-slate-200 shadow-none'
            )}
            title={!canReview ? 'Tombol nonaktif: Tugas belum dikirimkan oleh pegawai' : undefined}
          >
            Setujui Tugas (Selesai)
          </Button>
        </div>
      </div>

      {/* Keterangan Status Pengiriman Tugas & Ketersediaan Review */}
      {!canReview && !isCompleted && (
        <div className="mt-4 p-3 rounded-xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400">
          <AlertCircle className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
          <span>
            Tugas belum dikirimkan oleh pegawai (Status saat ini: <strong className="text-slate-800 dark:text-slate-200">{task.status}</strong>). Tombol <strong>Setujui</strong> dan <strong>Minta Revisi</strong> nonaktif dan akan otomatis aktif setelah pegawai menyerahkan hasil pekerjaan.
          </span>
        </div>
      )}

      {isCompleted && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>
            Tugas ini telah disetujui dan berstatus <strong>Selesai</strong>.
          </span>
        </div>
      )}

      {isSubmitted && (
        <div className="mt-4 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center gap-2.5 text-xs text-purple-800 dark:text-purple-300">
          <Sparkles className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
          <span>
            Pegawai telah menyerahkan hasil kerja (Status: <strong>Menunggu Review</strong>). Silakan periksa tautan hasil akhir di bawah, lalu tentukan apakah tugas disetujui atau memerlukan revisi.
          </span>
        </div>
      )}

      {/* Info catatan revisi terakhir jika ada */}
      {task.catatan_revisi && (
        <div className="mt-4 p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 space-y-1">
          <div className="font-semibold text-amber-950">
            Catatan Revisi Terakhir (Revisi #{task.revision_count || 1}):
          </div>
          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
            {task.catatan_revisi}
          </p>
        </div>
      )}

      {/* Modal Minta Revisi */}
      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleRequestRevision}>
            <DialogHeader>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-2">
                <RotateCcw className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Permintaan Revisi Tugas
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600">
                Status tugas akan otomatis berubah menjadi <span className="font-semibold text-amber-700">Revisi</span> dan jumlah revisi bertambah. Pegawai terkait akan menerima notifikasi beserta catatan ini.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              {errorMsg && (
                <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="catatan-revisi" className="text-xs font-semibold text-slate-700">
                  Catatan & Poin Perbaikan <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="catatan-revisi"
                  placeholder="Contoh: Perbaiki transisi di menit 01:15, font pada judul gunakan Sans-serif, serta sesuaikan saturasi warna clip drone..."
                  value={catatanRevisi}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCatatanRevisi(e.target.value)}
                  rows={4}
                  required
                  className="text-xs focus-visible:ring-amber-500"
                />
                <p className="text-[11px] text-slate-500">
                  Wajib diisi secara detail agar pegawai dapat langsung memperbaiki hasil kerja.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm" disabled={isLoading}>
                  Batal
                </Button>
              </DialogClose>
              <Button
                type="submit"
                size="sm"
                disabled={isLoading || !catatanRevisi.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 font-medium"
              >
                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Kirim Permintaan Revisi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Setujui Tugas */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Setujui & Selesaikan Tugas
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Apakah Anda yakin hasil kerja tugas <span className="font-semibold text-slate-800">&quot;{task.judul}&quot;</span> telah memenuhi seluruh standar?
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 text-xs text-slate-600 space-y-2">
            {errorMsg && (
              <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
                <span>{errorMsg}</span>
              </div>
            )}
            <p>
              Status tugas akan diubah menjadi <span className="font-semibold text-emerald-700">Selesai</span>. Notifikasi apresiasi akan dikirimkan ke pegawai yang ditugaskan dan tercatat di riwayat linimasa.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" disabled={isLoading}>
                Batal
              </Button>
            </DialogClose>
            <Button
              type="button"
              size="sm"
              onClick={handleApprove}
              disabled={isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              Ya, Setujui Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
