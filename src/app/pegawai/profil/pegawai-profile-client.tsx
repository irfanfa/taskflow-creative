'use client';

import React, { useState } from 'react';
import type { Profile, UserNotificationPreferences } from '@/types/database';
import { updateUserNotificationPreferences } from '@/app/actions/notifications';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  UserCircle,
  Bell,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Video,
  Palette,
  ShieldCheck,
  Clock,
} from 'lucide-react';

interface PegawaiProfileClientProps {
  profile: Profile;
  initialPreferences: UserNotificationPreferences;
}

export function PegawaiProfileClient({
  profile,
  initialPreferences,
}: PegawaiProfileClientProps) {
  const [preferences, setPreferences] = useState<UserNotificationPreferences>({
    ...initialPreferences,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedbackSuccess(null);
    setFeedbackError(null);

    const res = await updateUserNotificationPreferences({
      in_app_enabled: preferences.in_app_enabled,
      email_enabled: preferences.email_enabled,
    });

    setIsSaving(false);
    if (res.success) {
      setFeedbackSuccess('Preferensi saluran notifikasi berhasil disimpan.');
      setTimeout(() => setFeedbackSuccess(null), 4000);
    } else {
      setFeedbackError(res.error || 'Gagal menyimpan preferensi saluran.');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Profil &amp; Saluran Notifikasi
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola informasi profil kerja dan tentukan saluran penerimaan notifikasi serta pengingat deadline Anda.
        </p>
      </div>

      {/* Global Alerts */}
      {feedbackSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-medium animate-in fade-in-50">
          <span>{feedbackSuccess}</span>
        </div>
      )}
      {feedbackError && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-sm font-medium animate-in fade-in-50">
          <span>{feedbackError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Card 1: Informasi Akun / Profil */}
        <Card className="border-slate-200/90 dark:border-slate-800 shadow-xs rounded-xl flex flex-col h-full bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              {profile.role === 'pep'
                ? 'Informasi Profil Coworker'
                : profile.role === 'sosmed'
                ? 'Informasi Profil Pengelola Sosmed'
                : 'Informasi Akun Pegawai'}
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {profile.role === 'pep'
                ? 'Identitas akun rekan kerja (Coworker) siaran mitra KMB Team.'
                : profile.role === 'sosmed'
                ? 'Identitas akun pengelola media sosial tim KMB.'
                : 'Data identitas staf kreatif di KMB Team Creative.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 space-y-6 flex-1 flex flex-col justify-between">
            {/* Header Profil Singkat */}
            <div className="flex items-center gap-4">
              <Avatar
                src={profile.foto}
                fallback={profile.nama}
                alt={profile.nama}
                size="lg"
                className={`ring-4 ${profile.role === 'pep' ? 'ring-amber-100 dark:ring-amber-950/50' : 'ring-blue-100 dark:ring-blue-950/50'}`}
              />
              <div className="space-y-1 min-w-0">
                <div className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 truncate">
                  {profile.nama}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                  {profile.email}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {profile.role === 'pep' ? (
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs py-0.5 px-2.5 font-medium">
                      Coworker (Siaran)
                    </Badge>
                  ) : profile.role === 'sosmed' ? (
                    <Badge variant="rolePegawai" className="text-xs py-0.5 px-2.5 font-medium">
                      Pengelola Media Sosial
                    </Badge>
                  ) : (
                    <>
                      {profile.spesialisasi === 'Video Editor' && (
                        <Badge variant="specVideo" className="text-xs py-0.5 px-2.5 font-medium">
                          Video Editor
                        </Badge>
                      )}
                      {profile.spesialisasi === 'Desainer Grafis' && (
                        <Badge variant="specDesain" className="text-xs py-0.5 px-2.5 font-medium">
                          Desainer Grafis
                        </Badge>
                      )}
                    </>
                  )}
                  <Badge variant="success" className="text-xs py-0.5 px-2 font-medium">
                    Aktif
                  </Badge>
                </div>
              </div>
            </div>

            {/* Rincian Atribut Akun */}
            <div className="rounded-xl bg-slate-50/70 dark:bg-slate-950/60 p-4 border border-slate-200/80 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-0.5">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <UserCircle className="h-3.5 w-3.5 text-slate-400" />
                  <span>Tipe Akun:</span>
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {profile.role === 'pep'
                    ? 'Coworker (Siaran)'
                    : profile.role === 'sosmed'
                    ? 'Pengelola Sosmed'
                    : 'Staf Internal KMB'}
                </span>
              </div>

              <div className="flex items-center justify-between py-0.5 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                  <span>Wewenang Tugas:</span>
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {profile.role === 'pep'
                    ? 'Pembuat Tugas & Reviewer'
                    : profile.role === 'sosmed'
                    ? 'Pengelola Konten & Posting'
                    : 'Pelaksana Pengerjaan'}
                </span>
              </div>

              <div className="flex items-center justify-between py-0.5 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Zona Waktu:</span>
                </div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Asia/Jakarta (WIB)
                </span>
              </div>

              <div className="flex items-center justify-between py-0.5 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Status Akun:</span>
                </div>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                  Terverifikasi
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Pengaturan Saluran Notifikasi */}
        <Card className="border-slate-200/90 dark:border-slate-800 shadow-xs rounded-xl flex flex-col h-full bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Pilihan Saluran Notifikasi
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tentukan saluran pengiriman notifikasi tugas dan pengingat deadline Anda.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 flex-1 flex flex-col justify-between">
            <form onSubmit={handleSave} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3.5">
                {/* Saluran In-App */}
                <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                        Notifikasi In-App (Lonceng &amp; Dashboard)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Tampilkan badge merah di lonceng header dan daftar di Pusat Notifikasi saat ada tugas baru atau deadline mendekat.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={preferences.in_app_enabled}
                      onChange={(e) =>
                        setPreferences((prev) => ({ ...prev, in_app_enabled: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>

                {/* Saluran Email */}
                <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                        Notifikasi Email Instan
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Kirim email pengingat (H-3, H-1, 3 jam sebelum deadline) dan instruksi tugas baru langsung ke <strong className="text-slate-700 dark:text-slate-300 font-mono">{profile.email}</strong>.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={preferences.email_enabled}
                      onChange={(e) =>
                        setPreferences((prev) => ({ ...prev, email_enabled: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 font-semibold text-xs sm:text-sm text-white shadow-xs rounded-lg h-10 px-4"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                  Simpan Saluran Notifikasi
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    setFeedbackSuccess(null);
                    setFeedbackError(null);
                    try {
                      const { triggerNativeNotification } = await import('@/lib/notifications/device-notifications');
                      const res = await triggerNativeNotification({
                        title: 'Uji Notifikasi Tugas Baru',
                        body: 'Push notification aktif! Anda akan menerima peringatan saat ada tugas baru.',
                      });
                      if (res && !res.success) {
                        const errMsg = res.error || 'Gagal memicu notifikasi. Periksa izin di Pengaturan HP.';
                        setFeedbackError(errMsg);
                        alert('Gagal: ' + errMsg);
                      } else {
                        const successMsg = 'Tes notifikasi terkirim! Periksa status bar / layar atas HP Anda.';
                        setFeedbackSuccess(successMsg);
                        alert(successMsg);
                      }
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : String(err);
                      setFeedbackError(msg);
                      alert('Error: ' + msg);
                    }
                  }}
                  className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold rounded-lg h-10 px-4"
                >
                  Uji Push Notifikasi
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
