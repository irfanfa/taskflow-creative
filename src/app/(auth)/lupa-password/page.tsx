'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail } from 'lucide-react';

export default function LupaPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const supabase = createClient();
      const redirectUrl = `${window.location.origin}/login?message=reset-link-sent`;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        setErrorMessage(error.message || 'Gagal mengirim instruksi pemulihan kata sandi.');
        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        'Tautan instruksi pemulihan kata sandi telah dikirim ke email Anda. Silakan periksa kotak masuk atau spam.'
      );
      setIsLoading(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      setErrorMessage(`Terjadi kesalahan: ${message}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <Card className="border-slate-200/90 shadow-xl shadow-slate-200/50 backdrop-blur-sm bg-white/95">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="inline-flex mx-auto p-2.5 rounded-full bg-indigo-50 text-indigo-600 mb-1">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
            Pemulihan Kata Sandi
          </CardTitle>
          <CardDescription className="text-slate-500 text-sm">
            Masukkan email terdaftar Anda untuk menerima tautan pembuatan kata sandi baru.
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

          {!successMessage ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Alamat Email Terdaftar</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="nama@kmbteam.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    autoComplete="email"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 font-medium text-base shadow-indigo-200 hover:shadow-indigo-300 shadow-md"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengirim Instruksi...
                  </>
                ) : (
                  'Kirim Tautan Pemulihan'
                )}
              </Button>
            </form>
          ) : (
            <div className="pt-2">
              <Button asChild variant="outline" className="w-full h-11">
                <Link href="/login">Kembali ke Halaman Masuk</Link>
              </Button>
            </div>
          )}

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kembali ke Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
