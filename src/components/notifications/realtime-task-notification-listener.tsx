'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile, Notification } from '@/types/database';
import {
  initDeviceNotifications,
  triggerNativeNotification,
} from '@/lib/notifications/device-notifications';

interface RealtimeTaskNotificationListenerProps {
  profile: Profile;
}

export function RealtimeTaskNotificationListener({
  profile,
}: RealtimeTaskNotificationListenerProps) {
  const router = useRouter();
  const seenNotificationIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    // 1. Inisialisasi kanal notifikasi perangkat native (Android Notification Channel & Izin)
    initDeviceNotifications(router);

    const supabase = createClient();
    let isCancelled = false;

    // Helper untuk memicu notifikasi native secara terpusat dengan dedup
    const fireNotification = async (payload: {
      id?: string;
      title: string;
      body: string;
      taskId?: string;
      url?: string;
    }) => {
      if (payload.id && seenNotificationIds.current.has(payload.id)) {
        return; // Sudah pernah ditampilkan
      }
      if (payload.id) {
        seenNotificationIds.current.add(payload.id);
      }

      await triggerNativeNotification({
        title: payload.title,
        body: payload.body,
        taskId: payload.taskId,
        url: payload.url,
      });
    };

    // LAYER 1: Supabase Realtime Broadcast (Langsung via WebSocket, tidak tergantung publikasi DB)
    const broadcastChannel = supabase
      .channel('task-live-broadcast')
      .on('broadcast', { event: 'new_notification' }, async ({ payload }) => {
        if (!payload || isCancelled) return;

        const isRecipient = payload.recipientIds?.includes(profile.id);
        const isAdmin = profile.role === 'admin';

        if (isRecipient || isAdmin) {
          const targetUrl =
            profile.role === 'admin'
              ? `/admin/tugas/${payload.taskId}`
              : profile.role === 'pep'
              ? `/pep/tugas/${payload.taskId}`
              : profile.role === 'sosmed'
              ? `/sosmed/tugas/${payload.taskId}`
              : `/pegawai/tugas/${payload.taskId}`;

          await fireNotification({
            id: payload.notificationId || `${payload.taskId}-${Date.now()}`,
            title: payload.judul || 'Pemberitahuan Tugas Baru',
            body: payload.pesan || 'Ada tugas baru di KMB Team Creative.',
            taskId: payload.taskId,
            url: targetUrl,
          });
        }
      })
      .subscribe();

    // LAYER 2: Supabase Postgres Changes (Jika tabel notifications ada di publikasi realtime)
    const dbNotifChannel = supabase
      .channel(`db-notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        async (payload) => {
          if (isCancelled) return;
          const notif = payload.new;
          if (!notif || notif.user_id !== profile.id) return;

          const targetUrl =
            profile.role === 'admin'
              ? `/admin/tugas/${notif.task_id}`
              : profile.role === 'pep'
              ? `/pep/tugas/${notif.task_id}`
              : profile.role === 'sosmed'
              ? `/sosmed/tugas/${notif.task_id}`
              : `/pegawai/tugas/${notif.task_id}`;

          await fireNotification({
            id: notif.id,
            title: notif.judul || 'Pemberitahuan Tugas Baru',
            body: notif.pesan || 'Ada tugas baru yang ditugaskan kepada Anda.',
            taskId: notif.task_id || undefined,
            url: targetUrl,
          });
        }
      )
      .subscribe();

    // LAYER 3: Polling Fallback Berkala (Setiap 8 detik)
    // Menjamin notifikasi tetap masuk meskipun koneksi WebSocket sempat terputus di HP
    let lastCheckedTime = new Date().toISOString();

    const pollInterval = setInterval(async () => {
      if (isCancelled) return;
      try {
        const { data: newNotifs } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', profile.id)
          .gt('created_at', lastCheckedTime)
          .order('created_at', { ascending: false });

        if (newNotifs && newNotifs.length > 0) {
          const notifsList = newNotifs as unknown as Notification[];
          lastCheckedTime = notifsList[0].created_at;

          for (const notif of notifsList) {
            const targetUrl =
              profile.role === 'admin'
                ? `/admin/tugas/${notif.task_id}`
                : profile.role === 'pep'
                ? `/pep/tugas/${notif.task_id}`
                : profile.role === 'sosmed'
                ? `/sosmed/tugas/${notif.task_id}`
                : `/pegawai/tugas/${notif.task_id}`;

            await fireNotification({
              id: notif.id,
              title: notif.judul || 'Pemberitahuan Tugas Baru',
              body: notif.pesan || 'Ada tugas baru yang ditugaskan kepada Anda.',
              taskId: notif.task_id || undefined,
              url: targetUrl,
            });
          }
        }
      } catch (err) {
        console.warn('Realtime poll notifications error:', err);
      }
    }, 8000);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
      supabase.removeChannel(broadcastChannel);
      supabase.removeChannel(dbNotifChannel);
    };
  }, [profile.id, profile.role, router]);

  return null;
}
