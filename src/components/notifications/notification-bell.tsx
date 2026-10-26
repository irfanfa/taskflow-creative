'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Notification, Profile } from '@/types/database';
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/app/actions/notifications';
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  FileCheck2,
  Calendar,
  MessageSquare,
  ArrowRight,
  Check,
  ExternalLink,
} from 'lucide-react';

interface NotificationBellProps {
  profile: Profile;
}

export function NotificationBell({ profile }: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ambil data notifikasi awal
  const fetchNotifications = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(8);

    if (data) {
      setNotifications(data as Notification[]);
      const unread = (data as Notification[]).filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Supabase Realtime Subscription untuk notifikasi baru & update
    const supabase = createClient();
    const channel = supabase
      .channel(`realtime-notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile.id]);

  // Klik di luar dropdown untuk menutup
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = async (notif: Notification) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await markNotificationAsRead(notif.id);
    }

    setIsOpen(false);

    if (notif.task_id) {
      const targetUrl =
        profile.role === 'admin'
          ? `/admin/tugas/${notif.task_id}`
          : profile.role === 'pep'
          ? `/pep/tugas/${notif.task_id}`
          : profile.role === 'sosmed'
          ? `/sosmed/tugas/${notif.task_id}`
          : `/pegawai/tugas/${notif.task_id}`;
      router.push(targetUrl);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    await markAllNotificationsAsRead();
  };

  // Icon per tipe notifikasi
  const getIcon = (type: string) => {
    if (type.includes('overdue')) {
      return <AlertTriangle className="h-4 w-4 text-rose-600" />;
    }
    if (type.includes('3h')) {
      return <Flame className="h-4 w-4 text-orange-500" />;
    }
    if (type.includes('h1') || type.includes('h3')) {
      return <Clock className="h-4 w-4 text-amber-500" />;
    }
    if (type.includes('selesai')) {
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
    if (type.includes('revisi')) {
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    }
    if (type.includes('hasil')) {
      return <FileCheck2 className="h-4 w-4 text-purple-600" />;
    }
    return <Calendar className="h-4 w-4 text-indigo-600" />;
  };

  // Format relatif waktu
  const formatTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} m lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} j lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} h lalu`;
  };

  const centerUrl =
    profile.role === 'admin'
      ? '/admin/notifikasi'
      : profile.role === 'pep'
      ? '/pep/notifikasi'
      : profile.role === 'sosmed'
      ? '/sosmed/notifikasi'
      : '/pegawai/notifikasi';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Tombol Lonceng Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Lihat notifikasi"
        title="Pusat Notifikasi"
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu Notifikasi */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95">
          {/* Header Dropdown */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/70 dark:bg-slate-950/70">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">Notifikasi</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                  {unreadCount} baru
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
              >
                <Check className="h-3 w-3" />
                <span>Tandai semua</span>
              </button>
            )}
          </div>

          {/* List Notifikasi */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <Bell className="h-8 w-8 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                Belum ada notifikasi baru.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`flex items-start gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                    !notif.is_read ? 'bg-indigo-50/30 dark:bg-indigo-950/40' : ''
                  }`}
                >
                  <div className="mt-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 p-1.5 shrink-0">
                    {getIcon(notif.tipe)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {notif.judul}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 mt-0.5 leading-snug">
                      {notif.pesan}
                    </p>
                  </div>

                  {!notif.is_read && (
                    <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Dropdown */}
          <div className="border-t border-slate-100 bg-slate-50/50 p-2 text-center">
            <Link
              href={centerUrl}
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors py-1 px-3 rounded-lg hover:bg-indigo-50/80"
            >
              <span>Lihat Semua di Pusat Notifikasi</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
