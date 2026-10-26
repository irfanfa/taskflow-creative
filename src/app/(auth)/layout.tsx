import React from 'react';
import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 p-4 sm:p-6 md:p-8">
      {/* Header Logo */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1 shadow-xs overflow-hidden">
            <Image
              src="/logo.png"
              alt="KMB Team Creative Logo"
              width={48}
              height={36}
              className="h-full w-auto object-contain"
              priority
            />
          </div>
          <div className="flex items-center">
            <span className="font-bold text-lg text-slate-900 tracking-tight">KMB Team</span>
            <span className="font-bold text-lg text-blue-600 ml-1.5">Creative</span>
          </div>
        </div>
        <div className="text-xs text-slate-500 hidden sm:block">
          Zona Waktu: <span className="font-medium text-slate-700">Asia/Jakarta (WIB)</span>
        </div>
      </header>

      {/* Main Content Form */}
      <main className="w-full flex items-center justify-center my-auto py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto text-center text-xs text-slate-500 py-4">
        &copy; 2026 KMB Team Creative. Platform Kolaborasi & Monitoring Tim Kreatif.
      </footer>
    </div>
  );
}

