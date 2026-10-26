'use client';

import React, { useState } from 'react';
import type { Profile, UserSpecialization } from '@/types/database';
import {
  createEmployee,
  updateEmployee,
  toggleEmployeeStatus,
  resetEmployeePassword,
  softDeleteEmployee,
  restoreEmployee,
} from '@/app/actions/pegawai';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  UserPlus,
  Search,
  Filter,
  Video,
  Palette,
  Edit2,
  KeyRound,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

interface EmployeeManagementClientProps {
  initialEmployees: Profile[];
}

export function EmployeeManagementClient({ initialEmployees }: EmployeeManagementClientProps) {
  const [employees, setEmployees] = useState<Profile[]>(initialEmployees);
  const [searchQuery, setSearchQuery] = useState('');
  const [specFilter, setSpecFilter] = useState<'Semua' | 'Video Editor' | 'Desainer Grafis' | 'Pengelola Sosmed' | 'Coworker (PEP)'>('Semua');
  const [statusFilter, setStatusFilter] = useState<'Aktif' | 'Semua' | 'Terhapus'>('Aktif');

  // Dialog States
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Selected Employee & Form States
  const [selectedEmp, setSelectedEmp] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Add Form Data
  const [addForm, setAddForm] = useState({
    nama: '',
    email: '',
    password: 'Password123!',
    spesialisasi: 'Video Editor' as UserSpecialization,
    foto: '',
  });

  // Edit Form Data
  const [editForm, setEditForm] = useState<{
    nama: string;
    spesialisasi: UserSpecialization | null;
    status_aktif: boolean;
    foto: string;
  }>({
    nama: '',
    spesialisasi: 'Video Editor',
    status_aktif: true,
    foto: '',
  });

  // Password Reset Data
  const [newPassword, setNewPassword] = useState('');

  // Notification auto-dismiss
  const showFeedback = (success: string | null, error: string | null) => {
    setActionSuccess(success);
    setActionError(error);
    if (success) {
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // Filter Employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesSpec = true;
    if (specFilter === 'Coworker (PEP)') {
      matchesSpec = emp.role === 'pep';
    } else if (specFilter === 'Pengelola Sosmed') {
      matchesSpec = emp.role === 'sosmed';
    } else if (specFilter === 'Video Editor') {
      matchesSpec = emp.spesialisasi === 'Video Editor' && emp.role !== 'pep' && emp.role !== 'sosmed';
    } else if (specFilter === 'Desainer Grafis') {
      matchesSpec = emp.spesialisasi === 'Desainer Grafis' && emp.role !== 'pep' && emp.role !== 'sosmed';
    }

    const isSoftDeleted = Boolean(emp.deleted_at);
    let matchesStatus = true;
    if (statusFilter === 'Aktif') {
      matchesStatus = !isSoftDeleted && emp.status_aktif;
    } else if (statusFilter === 'Terhapus') {
      matchesStatus = isSoftDeleted;
    }

    return matchesSearch && matchesSpec && matchesStatus;
  });

  // Handlers
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setActionError(null);

    const res = await createEmployee(addForm);
    setIsLoading(false);

    if (res.success) {
      setAddDialogOpen(false);
      showFeedback('Pegawai baru berhasil ditambahkan dan siap login!', null);
      setAddForm({
        nama: '',
        email: '',
        password: 'Password123!',
        spesialisasi: 'Video Editor',
        foto: '',
      });
      // Update local state optimistic
      window.location.reload();
    } else {
      setActionError(res.error || 'Gagal menambahkan pegawai.');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    setIsLoading(true);
    setActionError(null);

    const res = await updateEmployee({
      id: selectedEmp.id,
      nama: editForm.nama,
      spesialisasi: editForm.spesialisasi,
      status_aktif: editForm.status_aktif,
      foto: editForm.foto,
    });
    setIsLoading(false);

    if (res.success) {
      setEditDialogOpen(false);
      showFeedback('Data pegawai berhasil diperbarui!', null);
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === selectedEmp.id
            ? {
                ...emp,
                nama: editForm.nama,
                spesialisasi: editForm.spesialisasi,
                status_aktif: editForm.status_aktif,
                foto: editForm.foto || null,
              }
            : emp
        )
      );
    } else {
      setActionError(res.error || 'Gagal mengedit pegawai.');
    }
  };

  const handleToggleStatus = async (emp: Profile) => {
    const res = await toggleEmployeeStatus(emp.id, emp.status_aktif);
    if (res.success && typeof res.newStatus === 'boolean') {
      const newStatus = res.newStatus;
      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, status_aktif: newStatus } : e))
      );
      showFeedback(
        `Status ${emp.nama} diubah menjadi ${newStatus ? 'Aktif' : 'Nonaktif'}`,
        null
      );
    } else {
      showFeedback(null, res.error || 'Gagal mengubah status.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    setIsLoading(true);
    setActionError(null);

    const res = await resetEmployeePassword(selectedEmp.id, newPassword);
    setIsLoading(false);

    if (res.success) {
      setPasswordDialogOpen(false);
      setNewPassword('');
      showFeedback(`Kata sandi untuk ${selectedEmp.nama} berhasil direset!`, null);
    } else {
      setActionError(res.error || 'Gagal mereset kata sandi.');
    }
  };

  const handleSoftDelete = async () => {
    if (!selectedEmp) return;

    setIsLoading(true);
    const res = await softDeleteEmployee(selectedEmp.id);
    setIsLoading(false);

    if (res.success) {
      setDeleteDialogOpen(false);
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === selectedEmp.id
            ? { ...emp, deleted_at: new Date().toISOString(), status_aktif: false }
            : emp
        )
      );
      showFeedback(`Pegawai ${selectedEmp.nama} telah dinonaktifkan (Soft Delete).`, null);
    } else {
      setActionError(res.error || 'Gagal menghapus pegawai.');
    }
  };

  const handleRestore = async (emp: Profile) => {
    setIsLoading(true);
    const res = await restoreEmployee(emp.id);
    setIsLoading(false);

    if (res.success) {
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === emp.id ? { ...e, deleted_at: null, status_aktif: true } : e
        )
      );
      showFeedback(`Akun pegawai ${emp.nama} berhasil dipulihkan!`, null);
    } else {
      showFeedback(null, res.error || 'Gagal memulihkan pegawai.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Manajemen Tim &amp; Coworker
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola data staf tim kreatif KMB dan akun Coworker (PEP Siaran), status akun, reset kata sandi, dan proteksi akun.
          </p>
        </div>
        <Button
          onClick={() => {
            setActionError(null);
            setAddDialogOpen(true);
          }}
          className="shadow-indigo-200 shadow-md font-semibold shrink-0"
        >
          Tambah Pegawai
        </Button>
      </div>

      {/* Global Alerts */}
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

      {/* Search & Filters */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Cari nama atau email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
                {(['Semua', 'Video Editor', 'Desainer Grafis', 'Pengelola Sosmed', 'Coworker (PEP)'] as const).map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => setSpecFilter(spec)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      specFilter === spec
                        ? spec === 'Coworker (PEP)'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : spec === 'Pengelola Sosmed'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {spec}
                  </button>
                ))}
              </div>

              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
                {(['Aktif', 'Terhapus', 'Semua'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      statusFilter === st
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Daftar Anggota Tim &amp; Coworker ({filteredEmployees.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Daftar akun tim pelaksana kreatif KMB dan akun Coworker mitra siaran.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredEmployees.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 text-sm">
              Tidak ada akun yang sesuai dengan filter atau kata kunci pencarian.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4 sm:px-6">Profil Anggota / Coworker</th>
                    <th className="py-3 px-4">Kategori / Spesialisasi</th>
                    <th className="py-3 px-4">Status Akun</th>
                    <th className="py-3 px-4 text-right">Aksi Manajemen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {filteredEmployees.map((emp) => {
                    const isSoftDeleted = Boolean(emp.deleted_at);

                    return (
                      <tr
                        key={emp.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
                          isSoftDeleted ? 'bg-slate-50/50 dark:bg-slate-950/50 opacity-75' : ''
                        }`}
                      >
                        {/* Profile Info */}
                        <td className="py-4 px-4 sm:px-6">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              src={emp.foto}
                              fallback={emp.nama}
                              alt={emp.nama}
                              size="md"
                            />
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 dark:text-slate-100 truncate flex items-center gap-2">
                                <span>{emp.nama}</span>
                                {emp.role === 'pep' ? (
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
                                    Coworker (PEP)
                                  </Badge>
                                ) : emp.role === 'sosmed' ? (
                                  <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] font-bold">
                                    Pengelola Sosmed
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium px-1.5 py-0.5 rounded">
                                    Tim KMB
                                  </span>
                                )}
                                {isSoftDeleted && (
                                  <span className="text-[10px] bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-bold px-1.5 py-0.5 rounded">
                                    Soft Deleted
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                                <span>{emp.email}</span>
                                {emp.role === 'pep' && (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                    • Coworker Siaran
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Specialization */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {emp.role === 'pep' ? (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-medium">
                              Kolaborator Siaran
                            </Badge>
                          ) : emp.role === 'sosmed' ? (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-medium">
                              Pengelola Media Sosial
                            </Badge>
                          ) : emp.spesialisasi === 'Video Editor' ? (
                            <Badge variant="specVideo" className="gap-1 font-medium">
                              <Video className="h-3 w-3" />
                              Video Editor
                            </Badge>
                          ) : emp.spesialisasi === 'Desainer Grafis' ? (
                            <Badge variant="specDesain" className="gap-1 font-medium">
                              <Palette className="h-3 w-3" />
                              Desainer Grafis
                            </Badge>
                          ) : (
                            <Badge variant="outline">Umum</Badge>
                          )}
                        </td>

                        {/* Status Toggle */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {!isSoftDeleted ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(emp)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                                emp.status_aktif
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                              title="Klik untuk mengubah status aktif"
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  emp.status_aktif ? 'bg-emerald-500' : 'bg-slate-400'
                                }`}
                              />
                              {emp.status_aktif ? 'Aktif' : 'Nonaktif'}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Terhapus</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {!isSoftDeleted ? (
                              <>
                                {/* Edit Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedEmp(emp);
                                    setEditForm({
                                      nama: emp.nama,
                                      spesialisasi: emp.spesialisasi,
                                      status_aktif: emp.status_aktif,
                                      foto: emp.foto || '',
                                    });
                                    setActionError(null);
                                    setEditDialogOpen(true);
                                  }}
                                  className="h-8 px-2 text-slate-600 hover:text-indigo-600"
                                  title="Edit Profil Pegawai"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>

                                {/* Reset Password Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedEmp(emp);
                                    setNewPassword('Password123!');
                                    setActionError(null);
                                    setPasswordDialogOpen(true);
                                  }}
                                  className="h-8 px-2 text-slate-600 hover:text-amber-600"
                                  title="Reset Kata Sandi"
                                >
                                  <KeyRound className="h-4 w-4" />
                                </Button>

                                {/* Soft Delete Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedEmp(emp);
                                    setActionError(null);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="h-8 px-2 text-slate-600 hover:text-rose-600"
                                  title="Nonaktifkan / Soft Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              /* Restore Button */
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestore(emp)}
                                className="h-8 gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Pulihkan
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIALOG 1: TAMBAH PEGAWAI */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogClose onClose={() => setAddDialogOpen(false)} />
        <DialogHeader>
          <DialogTitle>Tambah Pegawai Baru</DialogTitle>
          <DialogDescription>
            Akun autentikasi dan profil tim kreatif akan dibuat secara otomatis di Supabase.
          </DialogDescription>
        </DialogHeader>

        {actionError && (
          <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs mb-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="add-nama">Nama Lengkap</Label>
            <Input
              id="add-nama"
              required
              placeholder="Contoh: Rian Anggara"
              value={addForm.nama}
              onChange={(e) => setAddForm({ ...addForm, nama: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-email">Alamat Email Resmi</Label>
            <Input
              id="add-email"
              type="email"
              required
              placeholder="rian.editor@taskflow.local"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-password">Kata Sandi Awal</Label>
            <Input
              id="add-password"
              required
              placeholder="Password123!"
              value={addForm.password}
              onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
            />
            <p className="text-[11px] text-slate-400">Pegawai dapat mengubah sandi ini setelah login.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-spec">Spesialisasi Kreatif</Label>
            <select
              id="add-spec"
              value={addForm.spesialisasi || 'Video Editor'}
              onChange={(e) =>
                setAddForm({ ...addForm, spesialisasi: e.target.value as UserSpecialization })
              }
              className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 hover:border-slate-400 dark:hover:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
            >
              <option value="Video Editor">Video Editor</option>
              <option value="Desainer Grafis">Desainer Grafis</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="add-foto">URL Foto Profil (Opsional)</Label>
            <Input
              id="add-foto"
              placeholder="https://images.unsplash.com/..."
              value={addForm.foto}
              onChange={(e) => setAddForm({ ...addForm, foto: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan Pegawai
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* DIALOG 2: EDIT PEGAWAI / COWORKER */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogClose onClose={() => setEditDialogOpen(false)} />
        <DialogHeader>
          <DialogTitle>
            {selectedEmp?.role === 'pep' ? 'Edit Profil Coworker (PEP Siaran)' : 'Edit Data Pegawai'}
          </DialogTitle>
          <DialogDescription>
            {selectedEmp?.role === 'pep'
              ? 'Perbarui profil dan status aktif akun Coworker. Akun ini berada di bawah supervisi administratif Admin.'
              : 'Perbarui nama, spesialisasi keahlian, atau status keaktifan akun.'}
          </DialogDescription>
        </DialogHeader>

        {actionError && (
          <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs mb-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <form onSubmit={handleEdit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-nama">Nama Lengkap</Label>
            <Input
              id="edit-nama"
              required
              value={editForm.nama}
              onChange={(e) => setEditForm({ ...editForm, nama: e.target.value })}
            />
          </div>

          {selectedEmp?.role !== 'pep' ? (
            <div className="space-y-1.5">
              <Label htmlFor="edit-spec">Spesialisasi Kreatif</Label>
              <select
                id="edit-spec"
                value={editForm.spesialisasi || 'Video Editor'}
                onChange={(e) =>
                  setEditForm({ ...editForm, spesialisasi: e.target.value as UserSpecialization })
                }
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 hover:border-slate-400 dark:hover:border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                <option value="Video Editor">Video Editor</option>
                <option value="Desainer Grafis">Desainer Grafis</option>
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Peran Akun</Label>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Coworker (Siaran PEP)</span>
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">Coworker</Badge>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="edit-foto">URL Foto Profil</Label>
            <Input
              id="edit-foto"
              placeholder="https://..."
              value={editForm.foto}
              onChange={(e) => setEditForm({ ...editForm, foto: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="edit-status"
              checked={editForm.status_aktif}
              onChange={(e) => setEditForm({ ...editForm, status_aktif: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <Label htmlFor="edit-status" className="cursor-pointer text-sm font-medium text-slate-700">
              Akun Aktif (Dapat Login &amp; Mengakses Sistem)
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Perbarui Data
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* DIALOG 3: RESET PASSWORD */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogClose onClose={() => setPasswordDialogOpen(false)} />
        <DialogHeader>
          <DialogTitle>
            {selectedEmp?.role === 'pep' ? 'Reset Kata Sandi Coworker' : 'Reset Kata Sandi Pegawai'}
          </DialogTitle>
          <DialogDescription>
            Masukkan kata sandi baru untuk <strong>{selectedEmp?.nama}</strong> ({selectedEmp?.email}).
          </DialogDescription>
        </DialogHeader>

        {actionError && (
          <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs mb-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-pass">Kata Sandi Baru</Label>
            <Input
              id="reset-pass"
              type="text"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Set Kata Sandi Baru
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* DIALOG 4: KONFIRMASI SOFT DELETE */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogClose onClose={() => setDeleteDialogOpen(false)} />
        <DialogHeader>
          <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-2">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <DialogTitle>Nonaktifkan Pegawai (Soft Delete)?</DialogTitle>
          <DialogDescription>
            Anda akan menonaktifkan akun <strong>{selectedEmp?.nama}</strong>. Data riwayat tugas pegawai ini akan tetap tersimpan secara aman di sistem dan dapat dipulihkan kapan saja.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setDeleteDialogOpen(false)}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleSoftDelete}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Ya, Nonaktifkan Akun
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
