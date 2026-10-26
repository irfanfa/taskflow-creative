'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { Notification, Profile, UserRole } from '@/types/database';
import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from '@/app/actions/notifications';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Bell,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  FileCheck2,
  Calendar,
  Check,
  Trash2,
  Filter,
  ExternalLink,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface NotificationCenterClientProps {
  currentProfile: Profile;
  initialNotifications: Notification[];
}

export function NotificationCenterClient({
  currentProfile,
  initialNotifications,
}: NotificationCenterClientProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [activeFilter, setActiveFilter] = useState<'semua' | 'unread' | 'deadline' | 'tugas'>('semua');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter list
  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.is_read;
    if (activeFilter === 'deadline') return n.tipe.startsWith('deadline_');
    if (activeFilter === 'tugas') return !n.tipe.startsWith('deadline_');
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await markNotificationAsRead(id);
  };

  const handleMarkAllRead = async () => {
    setIsProcessing(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await markAllNotificationsAsRead();
    setIsProcessing(false);
  };

  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id);
  };

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

  const formatDateTimeWIB = (dateStr: string) => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(dateStr)) + ' WIB';
  };

  return (
    <div className="space-y-6">
      {/* Header Pusat Notifikasi */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Pusat Notifikasi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Riwayat lengkap pengingat deadline, penugasan baru, dan status verifikasi pekerjaan.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllRead}
            disabled={isProcessing}
            variant="outline"
            className="gap-2 text-xs font-semibold shrink-0"
          >
            <Check className="h-4 w-4 text-indigo-600" />
            Tandai Semua Dibaca ({unreadCount})
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveFilter('semua')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeFilter === 'semua'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Semua ({notifications.length})
        </button>
        <button
          onClick={() => setActiveFilter('unread')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeFilter === 'unread'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Belum Dibaca ({unreadCount})
        </button>
        <button
          onClick={() => setActiveFilter('deadline')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeFilter === 'deadline'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Pengingat Batas Waktu
        </button>
        <button
          onClick={() => setActiveFilter('tugas')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeFilter === 'tugas'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Pembaruan Tugas
        </button>
      </div>

      {/* List Notifikasi */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Tidak ada notifikasi"
            description="Anda belum memiliki notifikasi pada kategori ini."
            className="m-8"
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotifications.map((notif) => {
              const detailUrl = notif.task_id
                ? currentProfile.role === 'admin'
                  ? `/admin/tugas/${notif.task_id}`
                  : currentProfile.role === 'pep'
                  ? `/pep/tugas/${notif.task_id}`
                  : currentProfile.role === 'sosmed'
                  ? `/sosmed/tugas/${notif.task_id}`
                  : `/pegawai/tugas/${notif.task_id}`
                : null;

              return (
                <div
                  key={notif.id}
                  className={`p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    !notif.is_read ? 'bg-indigo-50/40' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="mt-0.5 rounded-xl bg-white border border-slate-200 p-2 shadow-xs shrink-0">
                      {getIcon(notif.tipe)}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {notif.judul}
                        </span>
                        {!notif.is_read && (
                          <span className="h-2 w-2 rounded-full bg-indigo-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                        {notif.pesan}
                      </p>
                      <div className="text-[11px] text-slate-400">
                        {formatDateTimeWIB(notif.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Tombol Aksi */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {detailUrl && (
                      <Button asChild size="sm" variant="outline" className="h-8 gap-1.5 text-xs font-semibold">
                        <Link
                          href={detailUrl}
                          onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                        >
                          <span>Buka Tugas</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}

                    {!notif.is_read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkRead(notif.id)}
                        className="h-8 px-2 text-indigo-600 hover:text-indigo-800 text-xs"
                        title="Tandai sudah dibaca"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(notif.id)}
                      className="h-8 px-2 text-slate-400 hover:text-rose-600 text-xs"
                      title="Hapus notifikasi"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
