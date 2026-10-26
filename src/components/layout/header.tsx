'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Menu, LogOut, Loader2, Video, Palette, Shield, Send, Users, Share2 } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { GlobalSearch } from '@/components/layout/global-search';
import { ThemeToggle } from '@/components/layout/theme-toggle';

interface HeaderProps {
  profile: Profile;
  onToggleSidebar?: () => void;
}

export function Header({ profile, onToggleSidebar }: HeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Error saat logout:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 px-3 sm:px-6 backdrop-blur-md transition-colors duration-200 gap-1.5 sm:gap-4">
      {/* Left side: Hamburger menu for mobile & Platform Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 md:flex-none">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white md:hidden shrink-0 transition-colors cursor-pointer"
          aria-label="Buka menu navigasi"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden lg:block leading-none mb-0.5">
            Platform Tim Kreatif
          </div>
          <div className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-[140px] xs:max-w-[180px] sm:max-w-none">
            {profile.role === 'admin'
              ? 'Pusat Kontrol Ketua Tim'
              : profile.role === 'pep'
              ? 'Portal Tugas PEP (Siaran)'
              : profile.role === 'sosmed'
              ? 'Ruang Kerja Pengelola Sosmed'
              : 'Ruang Kerja Pegawai (KMB)'}
          </div>
        </div>
      </div>

      {/* Middle / Center: Global Search (aligned adjacent to action icons on mobile, centered on desktop) */}
      <div className="shrink-0 md:flex-1 md:flex md:justify-center md:max-w-md md:mx-auto">
        <GlobalSearch role={profile.role} />
      </div>

      {/* Right side: Actions, Theme Toggle, Notification Bell, and Desktop Profile + Logout */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Theme Toggle (Light / Dark Mode) */}
        <ThemeToggle />

        {/* Lonceng Notifikasi Interaktif */}
        <NotificationBell profile={profile} />

        {/* Desktop-only: Divider */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block shrink-0" />

        {/* Desktop-only: User Profile Card */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          <Avatar
            src={profile.foto}
            fallback={profile.nama}
            alt={profile.nama}
            size="sm"
            className="h-9 w-9 shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
          />
          <div className="text-left max-w-[150px] lg:max-w-[200px]">
            <div
              className="text-xs lg:text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight truncate"
              title={profile.nama}
            >
              {profile.nama}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {profile.role === 'admin' ? (
                <Badge variant="roleAdmin" className="text-[10px] py-0 px-1.5 gap-1 font-medium">
                  <Shield className="h-2.5 w-2.5" />
                  Ketua Tim
                </Badge>
              ) : profile.role === 'pep' ? (
                <Badge variant="rolePep" className="text-[10px] py-0 px-1.5 gap-1 font-medium">
                  <Send className="h-2.5 w-2.5" />
                  PEP (Siaran)
                </Badge>
              ) : profile.role === 'sosmed' ? (
                <Badge variant="rolePegawai" className="text-[10px] py-0 px-1.5 gap-1 font-medium">
                  <Share2 className="h-2.5 w-2.5" />
                  Pengelola Sosmed
                </Badge>
              ) : (
                <Badge variant="rolePegawai" className="text-[10px] py-0 px-1.5 gap-1 font-medium">
                  <Users className="h-2.5 w-2.5" />
                  Pegawai (KMB)
                </Badge>
              )}

              {profile.spesialisasi === 'Video Editor' && (
                <Badge variant="specVideo" className="text-[10px] py-0 px-1.5 gap-1 font-medium">
                  <Video className="h-2.5 w-2.5" />
                  Video
                </Badge>
              )}

              {profile.spesialisasi === 'Desainer Grafis' && (
                <Badge variant="specDesain" className="text-[10px] py-0 px-1.5 gap-1 font-medium">
                  <Palette className="h-2.5 w-2.5" />
                  Desain
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Desktop-only: Divider */}
        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block shrink-0" />

        {/* Desktop-only: Logout Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="hidden md:inline-flex items-center h-9 px-3 gap-1.5 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900 transition-colors cursor-pointer"
          title="Keluar dari akun (Logout)"
          aria-label="Keluar dari akun"
        >
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin text-rose-500 shrink-0" />
          ) : (
            <LogOut className="h-4 w-4 text-rose-500 shrink-0" />
          )}
          <span className="font-medium text-xs lg:text-sm">Keluar</span>
        </Button>
      </div>
    </header>
  );
}

