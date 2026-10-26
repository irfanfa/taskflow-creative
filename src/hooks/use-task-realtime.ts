'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Task } from '@/types/database';

interface UseTaskRealtimeOptions {
  taskId: string;
  onUpdate?: (updatedTask: Partial<Task>) => void;
  autoRefresh?: boolean;
}

/**
 * Hook untuk sinkronisasi realtime pada halaman Detail Tugas (Admin, Pegawai, PEP)
 * Memantau perubahan tabel `tasks` secara live via WebSocket (Supabase Realtime)
 * sehingga status, link hasil, catatan revisi, dan aktivitas langsung terupdate tanpa reload.
 */
export function useTaskRealtime({
  taskId,
  onUpdate,
  autoRefresh = true,
}: UseTaskRealtimeOptions) {
  const router = useRouter();
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!taskId) return;

    const supabase = createClient();
    let isCancelled = false;
    let refreshTimeout: NodeJS.Timeout | null = null;

    const triggerRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        if (!isCancelled && autoRefresh) {
          router.refresh();
        }
      }, 250);
    };

    // 1. Dengar perubahan data spesifik tugas ini di PostgreSQL
    const taskChannel = supabase
      .channel(`task-detail-live-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          if (isCancelled) return;
          if (payload.new && onUpdateRef.current) {
            onUpdateRef.current(payload.new as Partial<Task>);
          }
          triggerRefresh();
        }
      )
      // 2. Dengar sinyal broadcast instan jika ada aksi kolaborasi
      .on('broadcast', { event: 'task_refresh' }, (payload) => {
        if (isCancelled) return;
        if (!payload?.payload?.taskId || payload.payload.taskId === taskId) {
          triggerRefresh();
        }
      })
      .subscribe();

    return () => {
      isCancelled = true;
      if (refreshTimeout) clearTimeout(refreshTimeout);
      supabase.removeChannel(taskChannel);
    };
  }, [taskId, autoRefresh, router]);
}

interface UseTasksListRealtimeOptions {
  channelName?: string;
  onUpdate?: () => void;
  autoRefresh?: boolean;
}

/**
 * Hook untuk sinkronisasi realtime pada daftar tugas (Kanban, List, Dashboard)
 * Begitu ada tugas baru dibuat, status diubah, atau dihapus oleh staf lain,
 * daftar tugas langsung terupdate otomatis tanpa reload.
 */
export function useTasksListRealtime({
  channelName = 'tasks-list-live',
  onUpdate,
  autoRefresh = true,
}: UseTasksListRealtimeOptions = {}) {
  const router = useRouter();
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const supabase = createClient();
    let isCancelled = false;
    let refreshTimeout: NodeJS.Timeout | null = null;

    const triggerRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout);
      refreshTimeout = setTimeout(() => {
        if (!isCancelled) {
          if (onUpdateRef.current) onUpdateRef.current();
          if (autoRefresh) router.refresh();
        }
      }, 250);
    };

    const listChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          triggerRefresh();
        }
      )
      .on('broadcast', { event: 'new_notification' }, () => {
        triggerRefresh();
      })
      .on('broadcast', { event: 'task_refresh' }, () => {
        triggerRefresh();
      })
      .subscribe();

    return () => {
      isCancelled = true;
      if (refreshTimeout) clearTimeout(refreshTimeout);
      supabase.removeChannel(listChannel);
    };
  }, [channelName, autoRefresh, router]);
}
