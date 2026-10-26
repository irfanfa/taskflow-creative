'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processAutomatedReminders } from '@/lib/notifications/reminder-engine';
import type { SystemNotificationSettings, UserNotificationPreferences } from '@/types/database';

/**
 * Tandai satu notifikasi sebagai sudah dibaca
 */
export async function markNotificationAsRead(notificationId: string) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu' };
  }

  try {
    const supabase = (await createClient()) as any;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', profile.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/notifikasi');
    revalidatePath('/pegawai/notifikasi');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

/**
 * Tandai seluruh notifikasi user sebagai sudah dibaca
 */
export async function markAllNotificationsAsRead() {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu' };
  }

  try {
    const supabase = (await createClient()) as any;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/notifikasi');
    revalidatePath('/pegawai/notifikasi');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

/**
 * Hapus satu notifikasi
 */
export async function deleteNotification(notificationId: string) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu' };
  }

  try {
    const supabase = (await createClient()) as any;
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', profile.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/notifikasi');
    revalidatePath('/pegawai/notifikasi');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

/**
 * Admin: Update pengaturan sistem notifikasi
 */
export async function updateSystemNotificationSettings(
  payload: Partial<SystemNotificationSettings>
) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Hanya administrator yang berwenang mengubah pengaturan sistem.' };
  }

  try {
    const supabase = (createAdminClient()) as any;
    const { error } = await supabase
      .from('system_notification_settings')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', '00000000-0000-0000-0000-000000000001');

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/pengaturan');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

/**
 * User (Admin & Pegawai): Update preferensi channel notifikasi
 */
export async function updateUserNotificationPreferences(
  payload: Partial<UserNotificationPreferences>
) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu' };
  }

  try {
    const supabase = (await createClient()) as any;
    const { error } = await supabase
      .from('user_notification_preferences')
      .upsert({
        user_id: profile.id,
        ...payload,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/pegawai/profil');
    revalidatePath('/admin/pengaturan');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

/**
 * Pemicu manual scheduler pengingat dari panel admin
 */
export async function triggerManualReminders() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Hanya administrator yang berwenang memicu pengingat manual.' };
  }

  try {
    const result = await processAutomatedReminders(new Date());
    revalidatePath('/admin');
    revalidatePath('/admin/notifikasi');
    revalidatePath('/pegawai/notifikasi');
    return { success: true, result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal memproses pengingat';
    return { success: false, error: msg };
  }
}

/**
 * Pemicu manual rekap harian tugas (08.00 WIB)
 * Fitur ini telah dinonaktifkan untuk seluruh role.
 */
export async function triggerDailyDigestManual() {
  return { success: false, error: 'Fitur Rekap Harian telah dinonaktifkan untuk semua role.' };
}

