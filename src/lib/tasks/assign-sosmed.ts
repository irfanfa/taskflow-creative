import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Otomatis tambahkan Pengelola Sosmed sebagai pelaksana / PJ tugas
 * ketika tugas berstatus 'Selesai' dan perlu diposting ke media sosial (perlu_upload_sosmed = true).
 */
export async function ensureSosmedAssignee(taskId: string, customClient?: any): Promise<boolean> {
  if (!taskId) return false;

  try {
    const adminSupabase = customClient || createAdminClient();

    // 1. Cari user dengan role 'sosmed' yang aktif
    const { data: sosmedProfile, error: pErr } = await adminSupabase
      .from('profiles')
      .select('id, nama, email')
      .eq('role', 'sosmed')
      .eq('status_aktif', true)
      .limit(1)
      .maybeSingle();

    if (pErr || !sosmedProfile) {
      console.warn('[ensureSosmedAssignee] Akun profil pengelola sosmed tidak ditemukan:', pErr?.message);
      return false;
    }

    // 2. Periksa apakah sudah terdaftar sebagai assignee di task_assignees
    const { data: existing, error: eErr } = await adminSupabase
      .from('task_assignees')
      .select('id')
      .eq('task_id', taskId)
      .eq('user_id', sosmedProfile.id)
      .maybeSingle();

    if (eErr && eErr.code !== 'PGRST116') {
      console.warn('[ensureSosmedAssignee] Perhatian saat cek assignee:', eErr.message);
    }

    // 3. Jika belum terdaftar, tambahkan sebagai assignee
    if (!existing) {
      const { error: insertErr } = await adminSupabase
        .from('task_assignees')
        .insert({
          task_id: taskId,
          user_id: sosmedProfile.id,
        });

      if (insertErr) {
        console.warn('[ensureSosmedAssignee] Gagal menambahkan sosmed ke task_assignees:', insertErr.message);
        return false;
      }

      console.log(`[ensureSosmedAssignee] Berhasil menambahkan Pengelola Sosmed (${sosmedProfile.email}) sebagai pelaksana tugas: ${taskId}`);
      return true;
    }

    return true;
  } catch (err) {
    console.error('[ensureSosmedAssignee] Terjadi kesalahan sistem:', err);
    return false;
  }
}
