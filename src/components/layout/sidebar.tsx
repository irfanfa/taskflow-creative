'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { UserRole, Profile } from '@/types/database';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Layers,
  LayoutDashboard,
  CheckSquare,
  Users,
  BarChart3,
  Settings,
  Clock,
  Send,
  FileCheck2,
  UserCircle,
  X,
  Sparkles,
  CalendarDays,
  Bell,
  PlusCircle,
  LogOut,
  Loader2,
  Shield,
  Share2,
} from 'lucide-react';

interface SidebarProps {
  role: UserRole;
  profile?: Profile;
  isOpen?: boolean;
  onClose?: () => void;
}

interface MenuItem {
  title: string;
  href: string;
  icon: React.ElementType;
  isPlaceholder?: boolean;
}

export function Sidebar({ role, profile, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
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

  const adminMenuItems: MenuItem[] = [
    {
      title: 'Ringkasan Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      isPlaceholder: false,
    },
    {
      title: 'Manajemen Tugas',
      href: '/admin/tugas',
      icon: CheckSquare,
      isPlaceholder: false,
    },
    {
      title: 'Kalender Tim',
      href: '/admin/kalender',
      icon: CalendarDays,
      isPlaceholder: false,
    },
    {
      title: 'Manajemen Pegawai',
      href: '/admin/pegawai',
      icon: Users,
      isPlaceholder: false,
    },
    {
      title: 'Laporan Kinerja',
      href: '/admin/laporan',
      icon: BarChart3,
      isPlaceholder: false,
    },
    {
      title: 'Log Aktivitas',
      href: '/admin/aktivitas',
      icon: Clock,
      isPlaceholder: false,
    },
    {
      title: 'Pusat Notifikasi',
      href: '/admin/notifikasi',
      icon: Bell,
      isPlaceholder: false,
    },
    {
      title: 'Pengaturan Sistem',
      href: '/admin/pengaturan',
      icon: Settings,
      isPlaceholder: false,
    },
  ];

  const pegawaiMenuItems: MenuItem[] = [
    {
      title: 'Tugas Saya',
      href: '/pegawai',
      icon: LayoutDashboard,
      isPlaceholder: false,
    },
    {
      title: 'Kalender Saya',
      href: '/pegawai/kalender',
      icon: CalendarDays,
      isPlaceholder: false,
    },
    {
      title: 'Pusat Notifikasi',
      href: '/pegawai/notifikasi',
      icon: Bell,
      isPlaceholder: false,
    },
    {
      title: 'Profil Saya',
      href: '/pegawai/profil',
      icon: UserCircle,
      isPlaceholder: false,
    },
  ];

  const pepMenuItems: MenuItem[] = [
    {
      title: 'Tugas Saya (PEP)',
      href: '/pep',
      icon: LayoutDashboard,
      isPlaceholder: false,
    },
    {
      title: 'Buat Tugas Baru',
      href: '/pep/tugas/baru',
      icon: PlusCircle,
      isPlaceholder: false,
    },
    {
      title: 'Pusat Notifikasi',
      href: '/pep/notifikasi',
      icon: Bell,
      isPlaceholder: false,
    },
    {
      title: 'Profil Saya',
      href: '/pep/profil',
      icon: UserCircle,
      isPlaceholder: false,
    },
  ];

  const sosmedMenuItems: MenuItem[] = [
    {
      title: 'Tugas Saya',
      href: '/sosmed',
      icon: LayoutDashboard,
      isPlaceholder: false,
    },
    {
      title: 'Tugas Posting',
      href: '/sosmed/tugas-posting',
      icon: Send,
      isPlaceholder: false,
    },
    {
      title: 'Kalender Saya',
      href: '/sosmed/kalender',
      icon: CalendarDays,
      isPlaceholder: false,
    },
    {
      title: 'Pusat Notifikasi',
      href: '/sosmed/notifikasi',
      icon: Bell,
      isPlaceholder: false,
    },
    {
      title: 'Profil Saya',
      href: '/sosmed/profil',
      icon: UserCircle,
      isPlaceholder: false,
    },
  ];

  const menuItems =
    role === 'admin'
      ? adminMenuItems
      : role === 'pep'
      ? pepMenuItems
      : role === 'sosmed'
      ? sosmedMenuItems
      : pegawaiMenuItems;

  const homeHref =
    role === 'admin'
      ? '/admin'
      : role === 'pep'
      ? '/pep'
      : role === 'sosmed'
      ? '/sosmed'
      : '/pegawai';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[300px] sm:w-72 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-transform duration-200 ease-in-out md:static md:translate-x-0 shadow-2xl md:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* App Branding */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-5 shrink-0 pt-[env(safe-area-inset-top,0px)]">
          <Link
            href={homeHref}
            onClick={() => onClose && onClose()}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="h-9 w-11 rounded-lg bg-slate-900 dark:bg-slate-800 flex items-center justify-center p-1 border border-slate-700/80 shadow-2xs overflow-hidden shrink-0">
              <Image
                src="/logo.png"
                alt="KMB Team Creative Logo"
                width={44}
                height={32}
                className="h-full w-auto object-contain"
                priority
              />
            </div>
            <div className="flex items-center whitespace-nowrap min-w-0">
              <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                KMB Team
              </span>
              <span className="font-bold text-sm sm:text-base text-blue-500 dark:text-blue-400 ml-1">
                Creative
              </span>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 md:hidden shrink-0 transition-colors cursor-pointer"
            aria-label="Tutup menu navigasi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role Badge Indicator */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Akses Panel
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold',
              role === 'admin'
                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                : role === 'pep'
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
            )}
          >
            {role === 'admin' ? (
              <Shield className="h-3.5 w-3.5 shrink-0" />
            ) : role === 'pep' ? (
              <Send className="h-3.5 w-3.5 shrink-0" />
            ) : role === 'sosmed' ? (
              <Share2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Users className="h-3.5 w-3.5 shrink-0" />
            )}
            {role === 'admin'
              ? 'Ketua Tim (Admin)'
              : role === 'pep'
              ? 'PEP (Siaran)'
              : role === 'sosmed'
              ? 'Pengelola Sosmed'
              : 'Pegawai (KMB)'}
          </span>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Menu Utama
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' &&
                item.href !== '/pegawai' &&
                item.href !== '/pep' &&
                item.href !== '/sosmed' &&
                pathname.startsWith(item.href));

            return (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  onClick={() => onClose && onClose()}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-semibold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
                    item.isPlaceholder && !isActive && 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-5 w-5 shrink-0',
                      isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                    )}
                  />
                  <span className="truncate flex-1">{item.title}</span>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Mobile-only: User Profile & Logout Section in Sidebar Footer */}
        {profile && (
          <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-slate-50/70 dark:bg-slate-950/70 shrink-0 md:hidden">
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <Link
                href={
                  profile.role === 'admin'
                    ? '/admin/pegawai'
                    : profile.role === 'pep'
                    ? '/pep/profil'
                    : profile.role === 'sosmed'
                    ? '/sosmed/profil'
                    : '/pegawai/profil'
                }
                onClick={() => onClose && onClose()}
                className="flex items-center gap-2.5 min-w-0 flex-1 group"
                title="Lihat profil saya"
              >
                <Avatar
                  src={profile.foto}
                  fallback={profile.nama}
                  alt={profile.nama}
                  size="sm"
                  className="h-9 w-9 shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {profile.nama}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                    {profile.role === 'admin'
                      ? 'Ketua Tim'
                      : profile.role === 'pep'
                      ? 'PEP (Siaran)'
                      : profile.role === 'sosmed'
                      ? 'Pengelola Sosmed'
                      : profile.spesialisasi || 'Pegawai'}
                  </div>
                </div>
              </Link>

              {/* Logout Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="h-8 w-8 p-0 rounded-lg shrink-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-800 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
                title="Keluar dari akun (Logout)"
                aria-label="Keluar dari akun"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                ) : (
                  <LogOut className="h-4 w-4 text-rose-500" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* System Timezone Notice */}
        <div className="border-t border-slate-100 dark:border-slate-800 p-3.5 bg-slate-50/50 dark:bg-slate-950/50 shrink-0 pb-[max(0.875rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))]">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5 text-slate-400" /> WIB (UTC+7)
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">v1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}
