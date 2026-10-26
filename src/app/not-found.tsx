import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Compass, ArrowLeft, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="relative mb-6">
        <div className="h-24 w-24 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-md">
          <Compass className="h-12 w-12 animate-pulse" />
        </div>
        <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          404
        </div>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-2">
        Halaman Tidak Ditemukan
      </h1>
      <p className="max-w-md text-sm text-slate-500 mb-8 leading-relaxed">
        Maaf, tautan atau halaman yang Anda tuju tidak tersedia atau Anda tidak memiliki hak akses untuk membukanya.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button asChild variant="default" className="w-full sm:w-auto gap-2">
          <Link href="/">
            <Home className="h-4 w-4" />
            Kembali ke Beranda
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full sm:w-auto gap-2">
          <Link href="/login">
            <ArrowLeft className="h-4 w-4" />
            Ke Halaman Masuk
          </Link>
        </Button>
      </div>

      <p className="text-xs text-slate-400 mt-12">
        KMB Team Creative &bull; Zona Waktu Asia/Jakarta (WIB)
      </p>
    </div>
  );
}
