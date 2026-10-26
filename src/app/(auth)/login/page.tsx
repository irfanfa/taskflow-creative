'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loginWithRateLimit } from '@/app/actions/auth';
import { Profile, UserRole } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Lock, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('redirect');
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorParam === 'inactive') {
      setErrorMessage('Akun Anda dinonaktifkan oleh administrator. Silakan hubungi manajemen.');
    }
  }, [errorParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let res: { success: boolean; role?: UserRole; nama?: string; error?: string } | null = null;

      // 1. Prioritaskan API Route /api/auth/login yang kebal terhadap routing context dan Server Action redirect
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });
        res = await response.json();
      } catch (fetchErr) {
        // 2. Fallback ke Server Action jika fetch API mengalami kendala
        res = await loginWithRateLimit({
          email: email.trim(),
          password,
        });
      }

      setIsLoading(false);

      if (!res || !res.success) {
        setErrorMessage(res?.error || 'Gagal masuk ke sistem. Silakan periksa kembali.');
        return;
      }

      setSuccessMessage(`Selamat datang kembali, ${res.nama}! Mengalihkan...`);

      const dest =
        redirectPath ||
        (res.role === 'admin'
          ? '/admin'
          : res.role === 'pep'
          ? '/pep'
          : res.role === 'sosmed'
          ? '/sosmed'
          : '/pegawai');
      setTimeout(() => {
        // Menggunakan hard navigation window.location.href untuk memastikan cookie sesi
        // terkirim sempurna pada Android WebView / Capacitor
        window.location.href = dest;
      }, 350);
    } catch (err: unknown) {
      console.error('[Login Error]', err);
      const message = err instanceof Error ? err.message : 'Terjadi kendala jaringan atau sistem';
      setErrorMessage(`Terjadi kesalahan: ${message}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <Card className="border-slate-200/90 shadow-xl shadow-slate-200/40 rounded-2xl bg-white">
        <CardHeader className="space-y-2 text-center pb-5 pt-7">
          <div className="inline-flex mx-auto p-3 rounded-2xl bg-blue-50 text-blue-600 mb-1 border border-blue-100/60 shadow-xs">
            <Lock className="h-6 w-6 stroke-[2.2]" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Masuk ke KMB Team <span className="text-blue-600">Creative</span>
          </CardTitle>
          <CardDescription className="text-slate-500 text-sm">
            Gunakan akun resmi Anda untuk mengelola dan memonitor tugas tim kreatif.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm animate-in fade-in-50">
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm animate-in fade-in-50">
              <div className="leading-relaxed">{successMessage}</div>
            </div>
          )}

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >
            {/* Input Email atau Username */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Email atau Username
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="email"
                  name="email"
                  type="text"
                  required
                  placeholder="Masukkan email atau username..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-10 pr-4 text-sm bg-slate-50/50 border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all rounded-lg"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Input Kata Sandi */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Kata Sandi
                </Label>
                <Link
                  href="/lupa-password"
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium transition-colors"
                >
                  Lupa kata sandi?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-10 pr-11 text-sm bg-slate-50/50 border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all rounded-lg"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md focus:outline-none transition-colors"
                  aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Tombol Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 font-semibold text-sm bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg shadow-sm hover:shadow transition-all pt-0.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                'Masuk Sekarang'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="w-full max-w-md p-8 text-center text-sm text-slate-500 bg-white rounded-xl border border-slate-200 shadow-sm">
          Memuat formulir masuk...
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}

