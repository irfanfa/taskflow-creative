'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Sparkles,
  AlertCircle,
  Send,
  Loader2,
  Info,
  FileText,
  Link2,
  Share2,
} from 'lucide-react';
import type { Profile, TaskPriority, TaskCategory } from '@/types/database';
import { createTask } from '@/app/actions/tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DatePickerPopover } from '@/components/ui/date-picker-popover';
import { TimePickerPopover } from '@/components/ui/time-picker-popover';
import { NarasumberUploader } from '@/components/media/narasumber-uploader';

interface PepCreateTaskClientProps {
  currentProfile: Profile;
  pegawaiAccounts: Profile[];
  categories?: TaskCategory[];
}

export function PepCreateTaskClient({
  currentProfile,
  pegawaiAccounts,
  categories = [],
}: PepCreateTaskClientProps) {
  const router = useRouter();

  // Primary Form State (Sederhana - Khusus Internal Instansi)
  const [judul, setJudul] = useState('');
  const [jenisPekerjaan, setJenisPekerjaan] = useState('Video Editing');
  const [prioritas, setPrioritas] = useState<TaskPriority>('Sedang');
  const [deadlineDate, setDeadlineDate] = useState(() => {
    const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [deadlineTime, setDeadlineTime] = useState('17:00');
  const [deskripsi, setDeskripsi] = useState('');
  const [linkReferensi, setLinkReferensi] = useState('');
  const [perluUploadSosmed, setPerluUploadSosmed] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!judul.trim()) {
      setErrorMsg('Judul tugas wajib diisi.');
      return;
    }
    if (!deadlineDate) {
      setErrorMsg('Tanggal batas waktu (deadline) wajib ditentukan.');
      return;
    }

    setIsLoading(true);

    try {
      // Format deadline ke ISO String (WIB GMT+7)
      const combinedDeadline = `${deadlineDate}T${deadlineTime || '17:00'}:00+07:00`;

      // Otomatis menugaskan ke akun Pegawai (KMB)
      const assigneeIds = pegawaiAccounts.map((p) => p.id);

      const result = await createTask({
        judul: judul.trim(),
        deskripsi: deskripsi.trim() || undefined,
        jenis_pekerjaan: jenisPekerjaan,
        klien_proyek: 'Internal Instansi', // Dihilangkan dari input, otomatis internal
        prioritas,
        deadline: combinedDeadline,
        spesifikasi_teknis: {}, // Dihapus sesuai permintaan simplifikasi
        link_referensi: linkReferensi.trim() || undefined,
        assignee_ids: assigneeIds,
        default_subtasks: [], // Dihapus sesuai permintaan simplifikasi
        perlu_upload_sosmed: perluUploadSosmed,
      });

      if (!result.success) {
        setErrorMsg(result.error || 'Gagal membuat tugas.');
        setIsLoading(false);
        return;
      }

      router.push('/pep');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      setErrorMsg(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      {/* Top Header & Back Button */}
      <div className="flex items-center justify-between">
        <Link
          href="/pep"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Dashboard PEP</span>
        </Link>

        <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-900/60 px-3 py-1 rounded-full">
          Pembuat: PEP (Siaran)
        </span>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Buat Tugas Siaran Baru
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Formulir penugasan internal untuk akun pelaksana <strong>Pegawai (KMB)</strong>.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Informasi Pokok Tugas */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              1. Informasi Pokok Tugas
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Tentukan judul, kategori pekerjaan siaran, dan batas waktu pengerjaan.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Judul Tugas */}
            <div className="space-y-1.5">
              <Label htmlFor="judul" className="text-xs font-semibold">
                Judul Tugas Siaran <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="judul"
                placeholder="Contoh: Video Teaser Program Siaran Spesial Idul Fitri"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            {/* Baris 1: Jenis Pekerjaan & Tingkat Prioritas (Sama persis dengan role Admin) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="jenis" className="text-xs font-semibold">
                  Jenis Pekerjaan <span className="text-rose-500">*</span>
                </Label>
                <select
                  id="jenis"
                  value={jenisPekerjaan}
                  onChange={(e) => {
                    const val = e.target.value;
                    setJenisPekerjaan(val);
                    if (val.toLowerCase().includes('e-flyer')) {
                      setPerluUploadSosmed(true);
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                >
                  <option value="Video Editing">Video Editing</option>
                  <option value="Desain E-Flyer">Desain E-Flyer</option>
                  <option value="Motion Graphic">Motion Graphic</option>
                  <option value="Banner Digital">Banner Digital</option>
                  {categories
                    .filter(
                      (c) =>
                        c.nama !== 'Video Editing' &&
                        c.nama !== 'Desain E-Flyer' &&
                        c.nama !== 'Motion Graphic' &&
                        c.nama !== 'Banner Digital'
                    )
                    .map((c) => (
                      <option key={c.id} value={c.nama}>
                        {c.nama}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prioritas" className="text-xs font-semibold">
                  Tingkat Prioritas <span className="text-rose-500">*</span>
                </Label>
                <select
                  id="prioritas"
                  value={prioritas}
                  onChange={(e) => setPrioritas(e.target.value as TaskPriority)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                >
                  <option value="Rendah">Rendah (Fleksibel)</option>
                  <option value="Sedang">Sedang (Standar operasional)</option>
                  <option value="Tinggi">Tinggi (Perlu fokus utama)</option>
                  <option value="Urgent">Urgent (Segera dikerjakan hari ini)</option>
                </select>
              </div>
            </div>

            {/* Baris 2: Tanggal & Pukul Deadline dengan Popover Interaktif (Sama persis dengan modal edit) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DatePickerPopover
                label="Batas Waktu (Deadline)"
                required
                value={deadlineDate}
                onChange={setDeadlineDate}
              />

              <TimePickerPopover
                label="Pukul (WIB)"
                value={deadlineTime}
                onChange={setDeadlineTime}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Kolom Brief & Instruksi Pengerjaan (Dilebarkan & Nyaman) */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
              2. Brief & Instruksi Pengerjaan Lengkap
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Tuliskan arahan detail pengerjaan, naskah script, narasi, konsep visual, maupun poin penting konten.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deskripsi" className="text-xs font-semibold block">
                Uraian Brief & Instruksi Pengerjaan
              </Label>
              <Textarea
                id="deskripsi"
                rows={12}
                placeholder="Tuliskan arahan lengkap di sini...&#10;&#10;Contoh arahan:&#10;1. Konsep & Nuansa: Santai, informatif, dan formal instansi.&#10;2. Urutan Materi / Naskah Narasi:&#10;   - Detik 0-5: Hook pembuka dengan cuplikan utama&#10;   - Detik 6-25: Penjelasan pesan kunci&#10;   - Detik 26-30: Call-to-action & logo instansi&#10;3. Catatan khusus: Gunakan audio latar bebas royalti dan teks penjelas yang mudah dibaca."
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="text-sm leading-relaxed min-h-[260px] p-4 font-normal"
              />
            </div>

            {/* Foto & Data Narasumber */}
            <div className="pt-2">
              <NarasumberUploader
                value={linkReferensi}
                onChange={setLinkReferensi}
                label="Foto & Data Narasumber (Maks. 3 Narasumber)"
                description="Upload secara bergantian untuk menghindari kegagalan, dan pastikan nama dan foto narasumber sudah sesuai"
              />
            </div>

            {/* Info Penugasan Pegawai (KMB) */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs mt-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600" />
                <span className="text-slate-600 dark:text-slate-300">
                  Tugas ini otomatis dialokasikan ke akun pelaksana:
                </span>
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                Pegawai (KMB)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Opsi Publikasi ke Media Sosial */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-start gap-3.5">
              <input
                type="checkbox"
                id="pepPerluUploadSosmed"
                checked={perluUploadSosmed}
                onChange={(e) => setPerluUploadSosmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="pepPerluUploadSosmed" className="cursor-pointer select-none space-y-1">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Publikasikan Konten ke Media Sosial (Tugas Posting)
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Centang opsi ini jika materi siaran ini perlu diunggah ke kanal media sosial tim. Ketika tugas disetujui (Status: Selesai), tugas akan otomatis masuk ke antrean <strong className="text-slate-700 dark:text-slate-300">Tugas Posting</strong> pada panel Pengelola Sosmed.
                </p>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/pep">
            <Button variant="outline" type="button" disabled={isLoading} className="text-xs">
              Batal
            </Button>
          </Link>

          <Button
            type="submit"
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs gap-1.5 shadow-sm px-6 h-10"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Terbitkan Tugas Siaran
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
