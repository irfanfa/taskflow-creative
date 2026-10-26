'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { TaskPriority, TaskStatus, TechnicalSpecs } from '@/types/database';
import {
  notifyTaskCreated,
  notifyDeadlineChanged,
  notifyTaskUpdated,
  notifyWorkSubmitted,
  notifyTaskReviewed,
} from '@/lib/notifications/events';
import { recordActivity } from '@/app/actions/collaboration';

export async function createTask(formData: {
  judul: string;
  deskripsi?: string;
  jenis_pekerjaan: string;
  klien_proyek?: string;
  prioritas: TaskPriority;
  tanggal_mulai?: string;
  deadline: string;
  spesifikasi_teknis?: TechnicalSpecs;
  link_referensi?: string;
  assignee_ids: string[];
  default_subtasks?: string[];
  perlu_upload_sosmed?: boolean;
}) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || (currentProfile.role !== 'admin' && currentProfile.role !== 'pep')) {
    return { success: false, error: 'Akses ditolak: Hanya Administrator atau PEP yang berwenang membuat tugas.' };
  }

  const {
    judul,
    deskripsi,
    jenis_pekerjaan,
    klien_proyek = 'Internal Instansi',
    prioritas,
    tanggal_mulai,
    deadline,
    spesifikasi_teknis = {},
    link_referensi,
    assignee_ids = [],
    default_subtasks = [],
    perlu_upload_sosmed = false,
  } = formData;

  const resolvedKlien = (klien_proyek && klien_proyek.trim()) ? klien_proyek.trim() : 'Internal Instansi';

  if (!judul || !jenis_pekerjaan || !prioritas || !deadline) {
    return { success: false, error: 'Harap lengkapi semua kolom wajib (Judul, Jenis, Prioritas, Deadline).' };
  }

  try {
    const supabase = (await createClient()) as any;
    const adminSupabase = createAdminClient() as any;

    // 1. Simpan tugas ke tabel tasks
    const insertPayload: any = {
      judul: judul.trim(),
      deskripsi: deskripsi?.trim() || null,
      jenis_pekerjaan,
      klien_proyek: resolvedKlien,
      prioritas,
      tanggal_mulai: tanggal_mulai || new Date().toISOString(),
      deadline,
      status: 'Belum Dimulai',
      spesifikasi_teknis,
      link_referensi: link_referensi?.trim() || null,
      perlu_upload_sosmed: !!perlu_upload_sosmed,
      created_by: currentProfile.id,
    };

    let { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert(insertPayload)
      .select('id')
      .single();

    // Fallback jika kolom perlu_upload_sosmed belum dibuat di database Supabase
    if (taskError && (taskError.code === '42703' || taskError.message?.includes('perlu_upload_sosmed'))) {
      delete insertPayload.perlu_upload_sosmed;
      const retry = await supabase
        .from('tasks')
        .insert(insertPayload)
        .select('id')
        .single();
      task = retry.data;
      taskError = retry.error;
    }

    if (taskError || !task) {
      return { success: false, error: taskError?.message || 'Gagal menyimpan tugas.' };
    }

    // Tentukan daftar penerima tugas (assignees)
    // Jika role PEP atau tidak ada assignee yang dipilih, otomatis arahkan ke akun Pegawai (KMB)
    let targetAssigneeIds = [...assignee_ids];
    if (currentProfile.role === 'pep' || targetAssigneeIds.length === 0) {
      const { data: activePegawai } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('role', 'pegawai')
        .eq('status_aktif', true)
        .is('deleted_at', null);

      if (activePegawai && activePegawai.length > 0) {
        targetAssigneeIds = activePegawai.map((p: any) => p.id);
      }
    }

    // 2. Simpan assignee ke task_assignees menggunakan adminSupabase (bypass RLS)
    if (targetAssigneeIds.length > 0) {
      const assigneesPayload = targetAssigneeIds.map((userId) => ({
        task_id: task.id,
        user_id: userId,
      }));

      const { error: assigneeError } = await adminSupabase
        .from('task_assignees')
        .insert(assigneesPayload);

      if (assigneeError) {
        console.error('Error insert assignees with admin client:', assigneeError);
        return { success: false, error: 'Gagal mengalokasikan tugas ke pegawai: ' + assigneeError.message };
      }

      notifyTaskCreated(
        {
          id: task.id,
          judul: judul.trim(),
          jenis_pekerjaan,
          klien_proyek: resolvedKlien,
          prioritas,
          deadline,
        } as any,
        targetAssigneeIds
      ).catch((e) => console.error('Error notifyTaskCreated:', e));
    }

    // 3. Simpan default_subtasks jika ada
    if (default_subtasks && default_subtasks.length > 0) {
      const subtasksPayload = default_subtasks
        .filter((s) => s && s.trim().length > 0)
        .map((title, idx) => ({
          task_id: task.id,
          judul: title.trim(),
          urutan: idx,
          is_completed: false,
        }));
      if (subtasksPayload.length > 0) {
        await adminSupabase.from('task_subtasks').insert(subtasksPayload);
      }
    }

    // 4. Catat aktivitas menggunakan adminSupabase
    const creatorLabel = currentProfile.role === 'pep' ? 'PEP (Siaran)' : 'Ketua Tim (Admin)';
    await adminSupabase.from('task_activities').insert({
      task_id: task.id,
      user_id: currentProfile.id,
      action_type: 'task_created',
      description: `${creatorLabel} membuat tugas baru: "${judul.trim()}"`,
    });

    revalidatePath('/admin/tugas');
    revalidatePath('/admin');
    revalidatePath('/pegawai');
    revalidatePath('/pegawai/kalender');
    revalidatePath('/pep');
    revalidatePath('/sosmed');
    revalidatePath('/sosmed/tugas-posting');
    return { success: true, taskId: task.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

export async function updateTask(formData: {
  id: string;
  judul: string;
  deskripsi?: string;
  jenis_pekerjaan: string;
  klien_proyek?: string;
  prioritas: TaskPriority;
  deadline: string;
  status?: TaskStatus;
  spesifikasi_teknis?: TechnicalSpecs;
  link_referensi?: string;
  link_hasil?: string;
  assignee_ids?: string[];
  perlu_upload_sosmed?: boolean;
}) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || (currentProfile.role !== 'admin' && currentProfile.role !== 'pep')) {
    return { success: false, error: 'Akses ditolak: Hanya Administrator atau PEP yang berwenang mengubah tugas.' };
  }

  const {
    id,
    judul,
    deskripsi,
    jenis_pekerjaan,
    klien_proyek = 'Internal Instansi',
    prioritas,
    deadline,
    spesifikasi_teknis = {},
    link_referensi,
    link_hasil,
    assignee_ids,
    perlu_upload_sosmed,
  } = formData;

  const resolvedKlien = (klien_proyek && klien_proyek.trim()) ? klien_proyek.trim() : 'Internal Instansi';

  try {
    const adminSupabase = createAdminClient() as any;

    // Ambil data task lama untuk validasi status dan pencatatan riwayat log
    let { data: oldTask, error: fetchError } = await adminSupabase
      .from('tasks')
      .select('id, judul, status, deadline, prioritas, jenis_pekerjaan, created_by, perlu_upload_sosmed')
      .eq('id', id)
      .single();

    // Fallback jika kolom perlu_upload_sosmed belum ada di DB
    if (fetchError && (fetchError.code === '42703' || fetchError.message?.includes('perlu_upload_sosmed'))) {
      const retry = await adminSupabase
        .from('tasks')
        .select('id, judul, status, deadline, prioritas, jenis_pekerjaan, created_by')
        .eq('id', id)
        .single();
      oldTask = retry.data;
      fetchError = retry.error;
    }

    if (fetchError || !oldTask) {
      return { success: false, error: 'Tugas tidak ditemukan.' };
    }

    // 1. Validasi: Hanya dapat diedit saat status masih 'Belum Dimulai' atau 'Dalam Antrean'
    if (oldTask.status !== 'Belum Dimulai' && oldTask.status !== 'Dalam Antrean') {
      return {
        success: false,
        error: 'Tugas tidak dapat diedit karena sudah mulai dikerjakan oleh pegawai.',
      };
    }

    // 2. Validasi wewenang PEP: PEP hanya boleh mengedit tugas buatannya sendiri
    if (currentProfile.role === 'pep' && oldTask.created_by !== currentProfile.id) {
      return {
        success: false,
        error: 'Akses ditolak: Anda hanya dapat mengedit tugas yang Anda buat sendiri.',
      };
    }

    // 3. Update data tugas
    const updatePayload: Record<string, any> = {
      judul: judul.trim(),
      deskripsi: deskripsi?.trim() || null,
      jenis_pekerjaan,
      klien_proyek: resolvedKlien,
      prioritas,
      deadline,
      spesifikasi_teknis,
      link_referensi: link_referensi?.trim() || null,
      link_hasil: link_hasil?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (perlu_upload_sosmed !== undefined) {
      updatePayload.perlu_upload_sosmed = !!perlu_upload_sosmed;
    }

    let { error: taskError } = await adminSupabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', id);

    if (taskError && (taskError.code === '42703' || taskError.message?.includes('perlu_upload_sosmed'))) {
      delete updatePayload.perlu_upload_sosmed;
      const retry = await adminSupabase
        .from('tasks')
        .update(updatePayload)
        .eq('id', id);
      taskError = retry.error;
    }

    if (taskError) {
      return { success: false, error: taskError.message };
    }

    // 4. Catat riwayat edit pada Riwayat & Log Aktivitas (task_activities)
    const changes: string[] = [];
    if (oldTask.judul !== judul.trim()) {
      changes.push(`Judul diubah menjadi "${judul.trim()}"`);
    }
    if (oldTask.jenis_pekerjaan !== jenis_pekerjaan) {
      changes.push(`Jenis pekerjaan diubah menjadi "${jenis_pekerjaan}"`);
    }
    if (oldTask.prioritas !== prioritas) {
      changes.push(`Prioritas diubah menjadi "${prioritas}"`);
    }
    if (oldTask.deadline !== deadline) {
      const formatWIB = (iso: string) => {
        try {
          return (
            new Intl.DateTimeFormat('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Jakarta',
            }).format(new Date(iso)) + ' WIB'
          );
        } catch {
          return iso;
        }
      };
      changes.push(`Deadline diubah menjadi ${formatWIB(deadline)}`);
    }

    const creatorLabel = currentProfile.role === 'pep' ? 'PEP (Siaran)' : 'Ketua Tim (Admin)';
    const changeSummary = changes.length > 0 ? changes.join(', ') : 'Brief & arahan pengerjaan diperbarui';

    await adminSupabase.from('task_activities').insert({
      task_id: id,
      user_id: currentProfile.id,
      action_type: 'task_updated',
      description: `${creatorLabel} mengedit tugas: ${changeSummary}`,
    });

    // 5. Jika ada assignee_ids dan user adalah admin, sinkronisasi assignee
    if (assignee_ids && currentProfile.role === 'admin') {
      await adminSupabase.from('task_assignees').delete().eq('task_id', id);
      if (assignee_ids.length > 0) {
        const assigneesPayload = assignee_ids.map((userId: string) => ({
          task_id: id,
          user_id: userId,
        }));
        await adminSupabase.from('task_assignees').insert(assigneesPayload);
      }
    }

    // Pastikan jika tugas berstatus Selesai dan perlu_upload_sosmed = true (atau Desain E-Flyer),
    // Pengelola Sosmed tetap tercatat sebagai pelaksana / PJ tugas
    const isCompletedAndSosmed = (oldTask.status === 'Selesai') && 
      (perlu_upload_sosmed ?? oldTask.perlu_upload_sosmed ?? jenis_pekerjaan?.toLowerCase().includes('e-flyer'));
    if (isCompletedAndSosmed) {
      const { ensureSosmedAssignee } = await import('@/lib/tasks/assign-sosmed');
      await ensureSosmedAssignee(id, adminSupabase);
    }

    // 6. Notifikasi perubahan
    const { data: currentAssignees } = await adminSupabase
      .from('task_assignees')
      .select('user_id')
      .eq('task_id', id);

    const targetUserIds = (currentAssignees || []).map((a: any) => a.user_id);
    if (targetUserIds.length > 0) {
      const updatedTaskObj = {
        id,
        judul: judul.trim(),
        jenis_pekerjaan,
        klien_proyek: resolvedKlien,
        prioritas,
        deadline,
      } as any;

      if (oldTask.deadline !== deadline) {
        notifyDeadlineChanged(updatedTaskObj, oldTask.deadline, deadline, targetUserIds).catch((e) =>
          console.error('Error notifyDeadlineChanged:', e)
        );
      } else {
        notifyTaskUpdated(updatedTaskObj, targetUserIds).catch((e) =>
          console.error('Error notifyTaskUpdated:', e)
        );
      }
    }

    revalidatePath(`/admin/tugas/${id}`);
    revalidatePath('/admin/tugas');
    revalidatePath('/admin');
    revalidatePath(`/pep/tugas/${id}`);
    revalidatePath('/pep');
    revalidatePath(`/pegawai/tugas/${id}`);
    revalidatePath('/pegawai');
    revalidatePath(`/sosmed/tugas/${id}`);
    revalidatePath('/sosmed');
    revalidatePath('/sosmed/tugas-posting');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
    return { success: false, error: msg };
  }
}

export async function updateTaskStatus(formData: {
  id: string;
  status: TaskStatus;
  link_hasil?: string;
}) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile) {
    return { success: false, error: 'Silakan masuk terlebih dahulu.' };
  }

  const { id, status, link_hasil } = formData;
  const isAdmin = currentProfile.role === 'admin';

  // ATURAN KEAMANAN: Pegawai DILARANG menandai status 'Selesai'
  if (!isAdmin && status === 'Selesai') {
    return {
      success: false,
      error: 'Akses ditolak: Hanya Administrator yang berwenang menyetujui dan menyelesaikan tugas (Selesai).',
    };
  }

  try {
    const supabase = (await createClient()) as any;

    // Ambil data tugas lama beserta penugasan untuk notifikasi kejadian
    const { data: currentTask } = await supabase
      .from('tasks')
      .select(`
        *,
        task_assignees (user_id)
      `)
      .eq('id', id)
      .single();

    // Jika pegawai, verifikasi bahwa tugas ini memang ditugaskan kepada pegawai tersebut
    if (!isAdmin) {
      const { data: isAssigned } = await supabase
        .from('task_assignees')
        .select('id')
        .eq('task_id', id)
        .eq('user_id', currentProfile.id)
        .maybeSingle();

      if (!isAssigned) {
        return { success: false, error: 'Akses ditolak: Anda tidak ditugaskan pada pekerjaan ini.' };
      }
    }

    // Normalisasi status ke database jika DB masih memiliki constraint nama lama
    const dbStatus = status === 'Dalam Antrean' ? 'Belum Dimulai' : status;
    const payload: Partial<{ status: TaskStatus; link_hasil: string | null }> = { status: dbStatus as TaskStatus };
    if (link_hasil !== undefined) {
      payload.link_hasil = link_hasil.trim() || null;
    }

    const { error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    // Trigger notifikasi kejadian sesuai perubahan status
    if (currentTask) {
      const assigneeIds = (currentTask.task_assignees || []).map((ta: any) => ta.user_id);

      if (status === 'Menunggu Review') {
        notifyWorkSubmitted(
          { ...currentTask, link_hasil: link_hasil || currentTask.link_hasil },
          currentProfile.nama
        ).catch((e) => console.error('Error notifyWorkSubmitted:', e));
      } else if (status === 'Selesai' || status === 'Revisi') {
        notifyTaskReviewed(currentTask, status, assigneeIds).catch((e) =>
          console.error('Error notifyTaskReviewed:', e)
        );

        if (status === 'Selesai') {
          const isPerluPosting = currentTask.perlu_upload_sosmed || 
            currentTask.jenis_pekerjaan?.toLowerCase().includes('e-flyer') || 
            currentTask.judul?.toLowerCase().includes('e-flyer');
          if (isPerluPosting) {
            const { ensureSosmedAssignee } = await import('@/lib/tasks/assign-sosmed');
            await ensureSosmedAssignee(id);
          }
        }
      }
    }

    revalidatePath(`/admin/tugas/${id}`);
    revalidatePath('/admin/tugas');
    revalidatePath('/admin');
    revalidatePath('/pegawai');
    revalidatePath(`/pegawai/tugas/${id}`);
    revalidatePath(`/sosmed/tugas/${id}`);
    revalidatePath('/sosmed');
    revalidatePath('/sosmed/tugas-posting');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

export async function softDeleteTask(id: string) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    return { success: false, error: 'Akses ditolak: Hanya Administrator yang berwenang menghapus tugas.' };
  }

  try {
    const adminSupabase = createAdminClient() as any;

    // Ambil data task lama untuk deskripsi activity log
    const { data: oldTask } = await adminSupabase
      .from('tasks')
      .select('id, judul')
      .eq('id', id)
      .single();

    const { error } = await adminSupabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    // Catat ke riwayat log aktivitas
    if (oldTask) {
      await adminSupabase.from('task_activities').insert({
        task_id: id,
        user_id: currentProfile.id,
        action_type: 'task_deleted',
        description: `Ketua Tim (Admin) ${currentProfile.nama} menghapus tugas "${oldTask.judul}" (dipindahkan ke arsip/sampah)`,
      });
    }

    revalidatePath('/admin/tugas');
    revalidatePath('/admin');
    revalidatePath('/pegawai');
    revalidatePath('/pep');
    revalidatePath(`/admin/tugas/${id}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

export async function createCategory(nama: string, tipe: string = 'Umum') {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    return { success: false, error: 'Akses ditolak: Hanya Administrator yang dapat menambah kategori.' };
  }

  if (!nama) {
    return { success: false, error: 'Nama kategori wajib diisi.' };
  }

  try {
    const adminSupabase = createAdminClient() as any;
    const { error } = await adminSupabase.from('task_categories').insert({
      nama: nama.trim(),
      tipe: tipe.trim(),
    });

    if (error) {
      if (error.message.includes('unique')) {
        return { success: false, error: 'Kategori ini sudah ada.' };
      }
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/tugas/baru');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Otomatisasi generate tugas e-flyer hari besar nasional mendatang
 */
export async function generateHolidayFlyersAction(): Promise<{
  success: boolean;
  createdCount?: number;
  existingCount?: number;
  message?: string;
  error?: string;
  createdTasks?: Array<{ id: string; judul: string; deadline: string }>;
}> {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    return { success: false, error: 'Akses ditolak: Hanya Administrator yang dapat menjalankan sinkronisasi hari besar.' };
  }

  try {
    const { syncUpcomingHolidayFlyers } = await import('@/lib/tasks/holiday-flyers');
    const result = await syncUpcomingHolidayFlyers({
      createdById: currentProfile.id,
    });
    return result;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Gagal sinkronisasi tugas hari besar';
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Pulihkan tugas dari Arsip/Sampah (Restore soft-deleted task)
 */
export async function restoreTask(id: string) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    return { success: false, error: 'Akses ditolak: Hanya Administrator yang berwenang memulihkan tugas.' };
  }

  try {
    const adminSupabase = createAdminClient() as any;

    const { data: oldTask } = await adminSupabase
      .from('tasks')
      .select('id, judul')
      .eq('id', id)
      .single();

    if (!oldTask) {
      return { success: false, error: 'Tugas tidak ditemukan di arsip.' };
    }

    const { error } = await adminSupabase
      .from('tasks')
      .update({ deleted_at: null, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await adminSupabase.from('task_activities').insert({
      task_id: id,
      user_id: currentProfile.id,
      action_type: 'task_restored',
      description: `Ketua Tim (Admin) ${currentProfile.nama} memulihkan tugas "${oldTask.judul}" dari arsip/sampah ke daftar aktif`,
    });

    revalidatePath('/admin/tugas');
    revalidatePath('/admin/tugas/arsip');
    revalidatePath('/admin');
    revalidatePath('/pegawai');
    revalidatePath('/pep');
    revalidatePath(`/admin/tugas/${id}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Hapus permanen tugas dari database (Hard Delete)
 */
export async function permanentDeleteTask(id: string) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    return { success: false, error: 'Akses ditolak: Hanya Administrator yang berwenang menghapus tugas secara permanen.' };
  }

  try {
    const adminSupabase = createAdminClient() as any;

    // Hard delete baris tugas dari database Supabase (Foreign key ON DELETE CASCADE akan membersihkan relasinya)
    const { error } = await adminSupabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/tugas');
    revalidatePath('/admin/tugas/arsip');
    revalidatePath('/admin');
    revalidatePath('/pegawai');
    revalidatePath('/pep');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Kosongkan seluruh tempat sampah (Hapus permanen semua tugas di arsip)
 */
export async function emptyTrashAction() {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    return { success: false, error: 'Akses ditolak: Hanya Administrator yang berwenang mengosongkan sampah.' };
  }

  try {
    const adminSupabase = createAdminClient() as any;

    const { error, count } = await adminSupabase
      .from('tasks')
      .delete({ count: 'exact' })
      .not('deleted_at', 'is', null);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/tugas');
    revalidatePath('/admin/tugas/arsip');
    revalidatePath('/admin');
    return { success: true, count: count || 0 };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Tandai tugas telah dipublikasikan ke media sosial (Pengelola Sosmed / Admin)
 */
export async function markTaskAsPosted(formData: {
  taskId: string;
  link_posting?: string;
  catatan_posting?: string;
}) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile) {
    return { success: false, error: 'Silakan masuk terlebih dahulu.' };
  }

  // Wewenang: Pengelola Sosmed atau Admin
  if (currentProfile.role !== 'sosmed' && currentProfile.role !== 'admin') {
    return {
      success: false,
      error: 'Akses ditolak: Hanya Pengelola Sosmed atau Administrator yang berwenang memperbarui status publikasi.',
    };
  }

  const { taskId, link_posting, catatan_posting } = formData;
  if (!taskId) {
    return { success: false, error: 'ID tugas tidak valid.' };
  }

  try {
    const adminSupabase = createAdminClient() as any;

    const { data: currentTask, error: fetchError } = await adminSupabase
      .from('tasks')
      .select('id, judul, status, perlu_upload_sosmed, klien_proyek')
      .eq('id', taskId)
      .single();

    if (fetchError || !currentTask) {
      return { success: false, error: 'Tugas tidak ditemukan.' };
    }

    const { error: updateError } = await adminSupabase
      .from('tasks')
      .update({
        status_posting: 'sudah_diposting',
        link_posting: link_posting?.trim() || null,
        catatan_posting: catatan_posting?.trim() || null,
        posted_at: new Date().toISOString(),
        posted_by: currentProfile.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (updateError) {
      if (updateError.code === '42703' || updateError.message?.includes('status_posting') || updateError.message?.includes('column')) {
        return {
          success: false,
          error: 'Kolom posting belum tersedia di database. Silakan jalankan file migrasi 20261025000002_add_perlu_upload_sosmed.sql di Supabase SQL Editor.',
        };
      }
      return { success: false, error: updateError.message };
    }

    // Catat ke task_activities
    await recordActivity({
      taskId,
      userId: currentProfile.id,
      actionType: 'task_posted',
      description: `${currentProfile.nama} (${currentProfile.role === 'sosmed' ? 'Pengelola Sosmed' : 'Admin'}) mempublikasikan materi ke media sosial${link_posting ? `: ${link_posting}` : ''}.`,
      newValue: 'sudah_diposting',
      oldValue: 'menunggu_posting',
    });

    revalidatePath('/sosmed/tugas-posting');
    revalidatePath('/sosmed');
    revalidatePath(`/sosmed/tugas/${taskId}`);
    revalidatePath('/admin/tugas');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
    return { success: false, error: msg };
  }
}

/**
 * Server Action: Batalkan status posting / kembalikan ke antrean publikasi
 */
export async function unmarkTaskAsPosted(taskId: string) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile) {
    return { success: false, error: 'Silakan masuk terlebih dahulu.' };
  }

  if (currentProfile.role !== 'sosmed' && currentProfile.role !== 'admin') {
    return { success: false, error: 'Akses ditolak.' };
  }

  try {
    const adminSupabase = createAdminClient() as any;

    const { error } = await adminSupabase
      .from('tasks')
      .update({
        status_posting: 'menunggu_posting',
        posted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (error) {
      if (error.code === '42703' || error.message?.includes('status_posting') || error.message?.includes('column')) {
        return {
          success: false,
          error: 'Kolom posting belum tersedia di database. Silakan jalankan file migrasi 20261025000002_add_perlu_upload_sosmed.sql di Supabase SQL Editor.',
        };
      }
      return { success: false, error: error.message };
    }

    await recordActivity({
      taskId,
      userId: currentProfile.id,
      actionType: 'task_post_cancelled',
      description: `${currentProfile.nama} membatalkan status posting media sosial.`,
      newValue: 'menunggu_posting',
      oldValue: 'sudah_diposting',
    });

    revalidatePath('/sosmed/tugas-posting');
    revalidatePath('/sosmed');
    revalidatePath(`/sosmed/tugas/${taskId}`);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
    return { success: false, error: msg };
  }
}

