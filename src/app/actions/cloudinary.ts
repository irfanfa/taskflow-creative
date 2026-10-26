'use server';

import { getCurrentProfile } from '@/lib/supabase/get-profile';
import {
  getCloudinaryUsage,
  cleanupExpiredCloudinaryAssets,
  isCloudinaryConfigured,
  CloudinaryUsageData,
  CloudinaryCleanupResult,
} from '@/lib/cloudinary/client';
import { revalidatePath } from 'next/cache';

/**
 * Mengambil statistik penggunaan Cloudinary untuk panel Admin
 */
export async function getCloudinaryUsageAction(): Promise<{
  success: boolean;
  isConfigured: boolean;
  data?: CloudinaryUsageData | null;
  error?: string;
}> {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== 'admin') {
      return { success: false, isConfigured: false, error: 'Hanya administrator yang berwenang melihat data penggunaan media.' };
    }

    if (!isCloudinaryConfigured()) {
      return { success: true, isConfigured: false, data: null };
    }

    const data = await getCloudinaryUsage();
    return { success: true, isConfigured: true, data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal mengambil data penggunaan Cloudinary';
    return { success: false, isConfigured: true, error: msg };
  }
}

/**
 * Pemicu manual pembersihan file lampiran Cloudinary (Admin only).
 * - Default: forceAll = true (menghapus paksa seluruh file lampiran termasuk yang baru diunggah < 7 hari).
 * - Atau dapat ditentukan days jika hanya ingin menghapus file tertentu.
 */
export async function triggerManualCleanupAction(
  options: { days?: number; forceAll?: boolean } | number = { forceAll: true }
): Promise<{
  success: boolean;
  result?: CloudinaryCleanupResult;
  error?: string;
}> {
  try {
    const profile = await getCurrentProfile();
    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Hanya administrator yang berwenang menjalankan pembersihan file.' };
    }

    if (!isCloudinaryConfigured()) {
      return { success: false, error: 'Kredensial Cloudinary belum dikonfigurasi di .env.local.' };
    }

    const cleanupOptions =
      typeof options === 'number'
        ? { days: options, forceAll: options <= 0 }
        : options;

    const result = await cleanupExpiredCloudinaryAssets(cleanupOptions);
    revalidatePath('/admin/pengaturan');
    return { success: true, result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kegagalan saat menjalankan pembersihan';
    return { success: false, error: msg };
  }
}
