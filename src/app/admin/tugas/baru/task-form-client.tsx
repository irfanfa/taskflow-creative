'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Profile, TaskPriority, TaskCategory, TaskTemplate } from '@/types/database';
import { createTask, createCategory } from '@/app/actions/tasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  Users,
  Bookmark,
  RotateCcw,
  FileText,
  Link2,
  Share2,
} from 'lucide-react';
import { NarasumberUploader } from '@/components/media/narasumber-uploader';

interface TaskFormClientProps {
  employees: Profile[];
  categories: TaskCategory[];
  templates?: TaskTemplate[];
  employeeWorkloads?: {
    workloads: Record<string, number>;
    maxLimit: number;
  };
}

export function TaskFormClient({
  employees,
  categories,
  templates = [],
  employeeWorkloads = { workloads: {}, maxLimit: 4 },
}: TaskFormClientProps) {
  const router = useRouter();

  // Template State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Form states (Disederhanakan untuk Internal Instansi)
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [jenisPekerjaan, setJenisPekerjaan] = useState('Video Editing');
  const [prioritas, setPrioritas] = useState<TaskPriority>('Sedang');

  // Dates (Default deadline: 3 hari ke depan jam 17:00 WIB)
  const defaultDeadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  defaultDeadline.setHours(17, 0, 0, 0);
  const formattedDefaultDeadline = defaultDeadline.toISOString().slice(0, 16);

  const [deadline, setDeadline] = useState(formattedDefaultDeadline);

  // Links
  const [linkReferensi, setLinkReferensi] = useState('');

  // Assignees: default pilih akun pegawai yang tersedia
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(
    employees.length === 1 ? [employees[0].id] : []
  );

  // Sosmed Posting Flag
  const [perluUploadSosmed, setPerluUploadSosmed] = useState(false);

  // Category Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState('Video');
  const [allCategories, setAllCategories] = useState<TaskCategory[]>(categories);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Handle template selection
  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;

    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;

    setJudul(tpl.nama);
    if (tpl.deskripsi) setDeskripsi(tpl.deskripsi);
    setJenisPekerjaan(tpl.jenis_pekerjaan);
    setPrioritas(tpl.prioritas_default || 'Sedang');

    // Auto-check jika template adalah Hari Besar atau E-Flyer
    if (
      tpl.nama.toLowerCase().includes('hari besar') ||
      tpl.nama.toLowerCase().includes('e-flyer') ||
      tpl.jenis_pekerjaan.toLowerCase().includes('e-flyer')
    ) {
      setPerluUploadSosmed(true);
    }

    // Apply estimated deadline
    if (tpl.estimasi_hari && tpl.estimasi_hari > 0) {
      const targetDate = new Date(Date.now() + tpl.estimasi_hari * 24 * 60 * 60 * 1000);
      targetDate.setHours(17, 0, 0, 0);
      setDeadline(targetDate.toISOString().slice(0, 16));
    }
  };

  const handleResetTemplate = () => {
    setSelectedTemplateId('');
    setJudul('');
    setDeskripsi('');
  };

  const toggleAssignee = (empId: string) => {
    setSelectedAssignees((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };


  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName) return;

    const res = await createCategory(newCategoryName, newCategoryType);
    if (res.success) {
      setAllCategories((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          nama: newCategoryName,
          tipe: newCategoryType,
          created_at: new Date().toISOString(),
        },
      ]);
      setJenisPekerjaan(newCategoryName);
      setNewCategoryName('');
      setCategoryModalOpen(false);
    } else {
      alert(res.error || 'Gagal menambahkan kategori.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);

    const payload = {
      judul: judul.trim(),
      deskripsi: deskripsi.trim() || undefined,
      klien_proyek: 'Internal Instansi', // Dihilangkan dari form, otomatis internal instansi
      jenis_pekerjaan: jenisPekerjaan,
      prioritas,
      deadline: new Date(deadline).toISOString(),
      spesifikasi_teknis: {}, // Dihapus sesuai permintaan simplifikasi
      link_referensi: linkReferensi.trim() || undefined,
      assignee_ids: selectedAssignees,
      default_subtasks: [], // Dihapus sesuai permintaan simplifikasi
      perlu_upload_sosmed: perluUploadSosmed,
    };

    const res = await createTask(payload);
    setIsLoading(false);

    if (res.success) {
      router.push('/admin/tugas');
      router.refresh();
    } else {
      setFormError(res.error || 'Gagal membuat tugas.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
          <Link href="/admin/tugas">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Daftar Tugas
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Buat Tugas Baru (Internal)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Formulir penugasan internal untuk tim kreatif pelaksana.
        </p>
      </div>

      {formError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-sm font-medium animate-in fade-in-50">
          <span>{formError}</span>
        </div>
      )}

      {/* TEMPLATE PICKER CARD */}
      {templates.length > 0 && (
        <Card className="border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Bookmark className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Gunakan Template Tugas Cepat
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Otomatis mengisi judul, jenis, dan estimasi batas waktu standar.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleApplyTemplate(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer min-w-[200px]"
                >
                  <option value="">-- Pilih Template Tersedia --</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.nama} ({tpl.jenis_pekerjaan})
                    </option>
                  ))}
                </select>

                {selectedTemplateId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResetTemplate}
                    title="Kosongkan pilihan template"
                    className="h-9 px-2.5 text-xs text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-rose-600 hover:border-rose-200"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: INFORMASI UTAMA TUGAS */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              1. Informasi Utama Tugas
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Judul tugas, jenis pekerjaan, prioritas, dan jadwal batas waktu.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="judul">Judul Tugas <span className="text-rose-500">*</span></Label>
              <Input
                id="judul"
                required
                placeholder="Contoh: Video Dokumentasi Sosialisasi Kebijakan Baru"
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="jenis">Jenis Pekerjaan <span className="text-rose-500">*</span></Label>
                  <button
                    type="button"
                    onClick={() => setCategoryModalOpen(true)}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Tambah
                  </button>
                </div>
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
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="Video Editing">Video Editing</option>
                  <option value="Desain E-Flyer">Desain E-Flyer</option>
                  <option value="Motion Graphic">Motion Graphic</option>
                  <option value="Banner Digital">Banner Digital</option>
                  {allCategories
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
                <Label htmlFor="prioritas">Tingkat Prioritas <span className="text-rose-500">*</span></Label>
                <select
                  id="prioritas"
                  value={prioritas}
                  onChange={(e) => setPrioritas(e.target.value as TaskPriority)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="Rendah">Rendah (Fleksibel)</option>
                  <option value="Sedang">Sedang (Standar operasional)</option>
                  <option value="Tinggi">Tinggi (Perlu fokus utama)</option>
                  <option value="Urgent">Urgent (Segera dikerjakan hari ini)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deadline">Batas Waktu (WIB) <span className="text-rose-500">*</span></Label>
                <input
                  id="deadline"
                  type="datetime-local"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: BRIEF & INSTRUKSI PENGERJAAN (LEBAR & LAPANG) */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              2. Brief & Instruksi Pengerjaan Lengkap
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Uraikan konsep, alur materi, naskah narasi, acuan visual, serta arahan detail untuk tim kreatif.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deskripsi" className="block text-xs font-semibold">
                Uraian Brief & Instruksi Pengerjaan
              </Label>
              <Textarea
                id="deskripsi"
                rows={12}
                placeholder="Tuliskan arahan lengkap di sini...&#10;&#10;Contoh arahan:&#10;1. Konsep & Nuansa: Formal, informatif, dan mudah dipahami oleh seluruh staf.&#10;2. Urutan Materi / Naskah Narasi:&#10;   - Bagian 1: Pembuka dan latar belakang kegiatan&#10;   - Bagian 2: Poin-poin instruksi utama&#10;   - Bagian 3: Penutup & logo instansi&#10;3. Catatan khusus: Pastikan audio jernih dan teks keterangan mudah dibaca."
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                className="text-sm leading-relaxed min-h-[260px] p-4 font-normal"
              />
            </div>

            <div className="pt-2">
              <NarasumberUploader
                value={linkReferensi}
                onChange={setLinkReferensi}
                label="Foto & Data Narasumber (Maks. 3 Narasumber)"
                description="Upload secara bergantian untuk menghindari kegagalan, dan pastikan nama dan foto narasumber sudah sesuai"
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION 3: PENUGASAN PEGAWAI */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  3. Penugasan Pegawai
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Pilih staf yang bertanggung jawab atas pengerjaan tugas ini.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {selectedAssignees.length} Pegawai Dipilih
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-4">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {employees.map((emp) => {
                const isSelected = selectedAssignees.includes(emp.id);
                const workload = employeeWorkloads.workloads[emp.id] || 0;

                return (
                  <div
                    key={emp.id}
                    onClick={() => toggleAssignee(emp.id)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/60 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={emp.foto}
                        fallback={emp.nama}
                        alt={emp.nama}
                        size="md"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                          {emp.nama}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{emp.spesialisasi || 'Pegawai Kreatif'}</span>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              workload > 0
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            <span>{workload} tugas aktif</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="h-4 w-4" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4: PUBLIKASI KE MEDIA SOSIAL (PENGELOLA SOSMED) */}
        <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <CardContent className="p-5">
            <div className="flex items-start gap-3.5">
              <input
                type="checkbox"
                id="perluUploadSosmed"
                checked={perluUploadSosmed}
                onChange={(e) => setPerluUploadSosmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="perluUploadSosmed" className="cursor-pointer select-none space-y-1">
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Publikasikan Konten ke Media Sosial (Tugas Posting)
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Centang opsi ini jika hasil karya perlu diunggah ke kanal media sosial tim. Ketika tugas telah selesai dan disetujui (Status: Selesai), tugas akan otomatis masuk ke menu <strong className="text-slate-700 dark:text-slate-300">Tugas Posting</strong> pada panel Pengelola Sosmed. Seluruh desain hari besar nasional otomatis dicentang.
                </p>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button asChild variant="outline" className="h-11 px-6">
            <Link href="/admin/tugas">Batal</Link>
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="h-11 px-8 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menyimpan Tugas...
              </>
            ) : (
              'Buat & Tugaskan Sekarang'
            )}
          </Button>
        </div>
      </form>

      {/* MODAL TAMBAH KATEGORI BARU */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddCategory} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Tambah Jenis Pekerjaan Baru</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Kategori baru akan langsung dapat dipilih pada penugasan tim.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="cat-nama">Nama Jenis Pekerjaan</Label>
                <Input
                  id="cat-nama"
                  placeholder="Contoh: Infografis Statis / Podcast Audio"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cat-tipe">Kelompok Tipe</Label>
                <select
                  id="cat-tipe"
                  value={newCategoryType}
                  onChange={(e) => setNewCategoryType(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Video">Video</option>
                  <option value="Desain">Desain Grafis</option>
                  <option value="Umum">Umum / Lainnya</option>
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCategoryModalOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                Simpan Jenis Pekerjaan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
