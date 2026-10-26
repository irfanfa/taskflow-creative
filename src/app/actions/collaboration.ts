'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  notifyTaskReviewed,
  notifyWorkSubmitted,
  notifyCommentMention,
} from '@/lib/notifications/events';
import type { Task, Profile } from '@/types/database';

/**
 * Helper internal untuk mencatat aktivitas ke tabel task_activities
 */
export async function recordActivity({
  taskId,
  userId,
  actionType,
  description,
  oldValue = null,
  newValue = null,
}: {
  taskId: string;
  userId: string;
  actionType: string;
  description: string;
  oldValue?: string | null;
  newValue?: string | null;
}) {
  try {
    const supabase = createAdminClient() as any;
    await supabase.from('task_activities').insert({
      task_id: taskId,
      user_id: userId,
      action_type: actionType,
      description,
      old_value: oldValue,
      new_value: newValue,
    });
  } catch (err) {
    console.error('Error recordActivity:', err);
  }
}

/**
 * Helper untuk verifikasi hak akses user terhadap tugas
 */
async function verifyTaskAccess(taskId: string, profile: Profile) {
  if (profile.role === 'admin') return true;

  const supabase = createAdminClient() as any;
  const { data: isAssigned } = await supabase
    .from('task_assignees')
    .select('id')
    .eq('task_id', taskId)
    .eq('user_id', profile.id)
    .maybeSingle();

  return !!isAssigned;
}

// ============================================================================
// 1. ALUR REVIEW: SETUJUI & MINTA REVISI
// ============================================================================

/**
 * Admin atau PEP (untuk tugas buatannya): Menyetujui tugas (Status menjadi 'Selesai')
 */
export async function approveTask({ taskId }: { taskId: string }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu.' };
  }

  try {
    const adminSupabase = createAdminClient() as any;

    const { data: task } = await adminSupabase
      .from('tasks')
      .select('*, task_assignees(user_id)')
      .eq('id', taskId)
      .single();

    if (!task) {
      return { success: false, error: 'Tugas tidak ditemukan.' };
    }

    const isAuthorized =
      profile.role === 'admin' ||
      (profile.role === 'pep' && task.created_by === profile.id);

    if (!isAuthorized) {
      return {
        success: false,
        error: 'Akses ditolak: Anda tidak berwenang menyetujui tugas ini.',
      };
    }

    if (task.status !== 'Menunggu Review') {
      return {
        success: false,
        error: 'Tugas belum dikirimkan oleh pegawai untuk direview.',
      };
    }

    const oldStatus = task.status;
    const { error } = await adminSupabase
      .from('tasks')
      .update({
        status: 'Selesai',
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Catat ke Log Aktivitas
    const reviewerLabel = profile.role === 'pep' ? 'PEP (Siaran)' : 'Ketua Tim (Admin)';
    await recordActivity({
      taskId,
      userId: profile.id,
      actionType: 'review_approved',
      description: `${reviewerLabel} menyetujui hasil kerja dan menyelesaikan tugas (Status: Selesai)`,
      oldValue: oldStatus,
      newValue: 'Selesai',
    });

    // Otomatis tambahkan role Pengelola Sosmed sebagai pelaksana / PJ jika tugas selesai dan perlu diposting
    const isPerluPosting = task.perlu_upload_sosmed || task.jenis_pekerjaan?.toLowerCase().includes('e-flyer') || task.judul?.toLowerCase().includes('e-flyer');
    if (isPerluPosting) {
      const { ensureSosmedAssignee } = await import('@/lib/tasks/assign-sosmed');
      await ensureSosmedAssignee(taskId, adminSupabase);
    }

    // Kirim notifikasi ke pegawai yang ditugaskan (dengan fallback jika assignees kosong)
    let assigneeIds = (task.task_assignees || []).map((ta: any) => ta.user_id);
    if (assigneeIds.length === 0) {
      const { data: assignees } = await adminSupabase
        .from('task_assignees')
        .select('user_id')
        .eq('task_id', taskId);
      assigneeIds = (assignees || []).map((a: any) => a.user_id);
    }
    if (assigneeIds.length === 0) {
      const { data: activePegawai } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('role', 'pegawai')
        .eq('status_aktif', true);
      assigneeIds = (activePegawai || []).map((p: any) => p.id);
    }

    if (assigneeIds.length > 0) {
      notifyTaskReviewed(task, 'Selesai', assigneeIds, undefined, profile.role).catch((e) =>
        console.error('Error notifyTaskReviewed:', e)
      );
    }

    revalidatePath(`/admin/tugas/${taskId}`);
    revalidatePath(`/pegawai/tugas/${taskId}`);
    revalidatePath(`/pep/tugas/${taskId}`);
    revalidatePath(`/sosmed/tugas/${taskId}`);
    revalidatePath('/admin/tugas');
    revalidatePath('/admin');
    revalidatePath('/pegawai');
    revalidatePath('/pep');
    revalidatePath('/sosmed');
    revalidatePath('/sosmed/tugas-posting');

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

/**
 * Admin atau PEP (untuk tugas buatannya): Meminta revisi
 */
export async function requestTaskRevision({
  taskId,
  catatanRevisi,
}: {
  taskId: string;
  catatanRevisi: string;
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu.' };
  }

  if (!catatanRevisi || !catatanRevisi.trim()) {
    return { success: false, error: 'Catatan revisi wajib diisi agar pegawai memahami hal yang perlu diperbaiki.' };
  }

  try {
    const adminSupabase = createAdminClient() as any;

    const { data: task } = await adminSupabase
      .from('tasks')
      .select('*, task_assignees(user_id)')
      .eq('id', taskId)
      .single();

    if (!task) {
      return { success: false, error: 'Tugas tidak ditemukan.' };
    }

    const isAuthorized =
      profile.role === 'admin' ||
      (profile.role === 'pep' && task.created_by === profile.id);

    if (!isAuthorized) {
      return {
        success: false,
        error: 'Akses ditolak: Anda tidak berwenang meminta revisi pada tugas ini.',
      };
    }

    if (task.status !== 'Menunggu Review') {
      return {
        success: false,
        error: 'Tugas belum dikirimkan oleh pegawai untuk direview.',
      };
    }

    const currentCount = task.revision_count || 0;
    const newCount = currentCount + 1;
    const oldStatus = task.status;
    const trimmedNote = catatanRevisi.trim();

    const { error } = await adminSupabase
      .from('tasks')
      .update({
        status: 'Revisi',
        revision_count: newCount,
        catatan_revisi: trimmedNote,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Catat ke Log Aktivitas
    const reviewerLabel = profile.role === 'pep' ? 'PEP (Siaran)' : 'Ketua Tim (Admin)';
    await recordActivity({
      taskId,
      userId: profile.id,
      actionType: 'review_revision',
      description: `${reviewerLabel} meminta Revisi ke-${newCount}: "${trimmedNote}"`,
      oldValue: oldStatus,
      newValue: 'Revisi',
    });

    // Kirim notifikasi ke pegawai yang ditugaskan (dengan fallback jika assignees kosong)
    let assigneeIds = (task.task_assignees || []).map((ta: any) => ta.user_id);
    if (assigneeIds.length === 0) {
      const { data: assignees } = await adminSupabase
        .from('task_assignees')
        .select('user_id')
        .eq('task_id', taskId);
      assigneeIds = (assignees || []).map((a: any) => a.user_id);
    }
    if (assigneeIds.length === 0) {
      const { data: activePegawai } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('role', 'pegawai')
        .eq('status_aktif', true);
      assigneeIds = (activePegawai || []).map((p: any) => p.id);
    }

    if (assigneeIds.length > 0) {
      notifyTaskReviewed(task, 'Revisi', assigneeIds, trimmedNote, profile.role).catch((e) =>
        console.error('Error notifyTaskReviewed:', e)
      );
    }

    revalidatePath(`/admin/tugas/${taskId}`);
    revalidatePath(`/pegawai/tugas/${taskId}`);
    revalidatePath(`/pep/tugas/${taskId}`);
    revalidatePath('/admin/tugas');
    revalidatePath('/admin');
    revalidatePath('/pegawai');
    revalidatePath('/pep');

    return { success: true, revisionCount: newCount };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

/**
 * Pegawai/Admin: Mengajukan / Menyerahkan hasil kerja (Status menjadi 'Menunggu Review')
 */
export async function submitWorkForReview({
  taskId,
  linkHasil,
}: {
  taskId: string;
  linkHasil?: string;
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu.' };
  }

  const hasAccess = await verifyTaskAccess(taskId, profile);
  if (!hasAccess) {
    return { success: false, error: 'Akses ditolak: Anda tidak memiliki akses pada tugas ini.' };
  }

  try {
    const supabase = (await createClient()) as any;

    const { data: task } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (!task) {
      return { success: false, error: 'Tugas tidak ditemukan.' };
    }

    const payload: any = {
      status: 'Menunggu Review',
      updated_at: new Date().toISOString(),
    };
    if (linkHasil !== undefined) {
      payload.link_hasil = linkHasil.trim() || null;
    }

    const { error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', taskId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Catat ke Log Aktivitas
    await recordActivity({
      taskId,
      userId: profile.id,
      actionType: 'submit_review',
      description: `${profile.nama} menyerahkan hasil kerja untuk ditinjau oleh Administrator`,
      oldValue: task.status,
      newValue: 'Menunggu Review',
    });

    // Kirim notifikasi ke Admin
    notifyWorkSubmitted(
      { ...task, link_hasil: linkHasil || task.link_hasil },
      profile.nama
    ).catch((e) => console.error('Error notifyWorkSubmitted:', e));

    revalidatePath(`/admin/tugas/${taskId}`);
    revalidatePath(`/pegawai/tugas/${taskId}`);
    revalidatePath('/admin/tugas');
    revalidatePath('/admin');
    revalidatePath('/pegawai');

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

// ============================================================================
// 2. KOMENTAR & DISKUSI (@MENTION)
// ============================================================================

export async function addTaskComment({
  taskId,
  pesan,
  mentions = [],
}: {
  taskId: string;
  pesan: string;
  mentions?: string[];
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu.' };
  }

  if (!pesan || !pesan.trim()) {
    return { success: false, error: 'Pesan komentar tidak boleh kosong.' };
  }

  const hasAccess = await verifyTaskAccess(taskId, profile);
  if (!hasAccess) {
    return { success: false, error: 'Akses ditolak: Anda tidak memiliki akses pada tugas ini.' };
  }

  try {
    const supabase = (await createClient()) as any;

    const { data: comment, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: profile.id,
        pesan: pesan.trim(),
        mentions: mentions || [],
      })
      .select('id')
      .single();

    if (error || !comment) {
      return { success: false, error: error?.message || 'Gagal menyimpan komentar.' };
    }

    // Catat ke Log Aktivitas
    await recordActivity({
      taskId,
      userId: profile.id,
      actionType: 'comment_added',
      description: `${profile.nama} menambahkan komentar: "${pesan.trim().slice(0, 60)}${pesan.length > 60 ? '...' : ''}"`,
    });

    // Kirim notifikasi ke user yang di-mention
    if (mentions.length > 0) {
      // Ambil detail tugas untuk data notifikasi
      const { data: task } = await supabase
        .from('tasks')
        .select('judul, klien_proyek, prioritas, deadline')
        .eq('id', taskId)
        .single();

      if (task) {
        notifyCommentMention({
          taskId,
          taskTitle: task.judul,
          clientName: task.klien_proyek,
          senderName: profile.nama,
          mentionedUserIds: mentions,
          commentText: pesan.trim(),
          priority: task.prioritas,
          deadline: task.deadline,
        }).catch((e) => console.error('Error notifyCommentMention:', e));
      }
    }

    revalidatePath(`/admin/tugas/${taskId}`);
    revalidatePath(`/pegawai/tugas/${taskId}`);

    return { success: true, commentId: comment.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

export async function deleteTaskComment({ commentId, taskId }: { commentId: string; taskId: string }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu.' };
  }

  try {
    const supabase = (await createClient()) as any;

    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/admin/tugas/${taskId}`);
    revalidatePath(`/pegawai/tugas/${taskId}`);

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

// ============================================================================
// 3. SUBTASK / CHECKLIST DALAM TUGAS
// ============================================================================

export async function addSubtask({ taskId, judul }: { taskId: string; judul: string }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu.' };
  }

  if (!judul || !judul.trim()) {
    return { success: false, error: 'Judul subtask wajib diisi.' };
  }

  const hasAccess = await verifyTaskAccess(taskId, profile);
  if (!hasAccess) {
    return { success: false, error: 'Akses ditolak: Anda tidak memiliki akses pada tugas ini.' };
  }

  try {
    const supabase = (await createClient()) as any;

    // Ambil urutan terakhir
    const { data: existing } = await supabase
      .from('task_subtasks')
      .select('urutan')
      .eq('task_id', taskId)
      .order('urutan', { ascending: false })
      .limit(1);

    const nextUrutan = existing && existing.length > 0 ? existing[0].urutan + 1 : 0;

    const { data: subtask, error } = await supabase
      .from('task_subtasks')
      .insert({
        task_id: taskId,
        judul: judul.trim(),
        is_completed: false,
        urutan: nextUrutan,
      })
      .select('id')
      .single();

    if (error || !subtask) {
      return { success: false, error: error?.message || 'Gagal menambahkan subtask.' };
    }

    // Catat ke Log Aktivitas
    await recordActivity({
      taskId,
      userId: profile.id,
      actionType: 'subtask_created',
      description: `${profile.nama} menambahkan checklist: "${judul.trim()}"`,
    });

    revalidatePath(`/admin/tugas/${taskId}`);
    revalidatePath(`/pegawai/tugas/${taskId}`);

    return { success: true, subtaskId: subtask.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

export async function toggleSubtask({
  subtaskId,
  taskId,
  isCompleted,
}: {
  subtaskId: string;
  taskId: string;
  isCompleted: boolean;
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu.' };
  }

  const hasAccess = await verifyTaskAccess(taskId, profile);
  if (!hasAccess) {
    return { success: false, error: 'Akses ditolak: Anda tidak memiliki akses pada tugas ini.' };
  }

  try {
    const supabase = (await createClient()) as any;

    const { data: currentSubtask } = await supabase
      .from('task_subtasks')
      .select('judul')
      .eq('id', subtaskId)
      .single();

    const { error } = await supabase
      .from('task_subtasks')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', subtaskId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Catat ke Log Aktivitas
    if (currentSubtask) {
      await recordActivity({
        taskId,
        userId: profile.id,
        actionType: 'subtask_toggled',
        description: isCompleted
          ? `${profile.nama} menyelesaikan checklist: "${currentSubtask.judul}"`
          : `${profile.nama} membuka kembali checklist: "${currentSubtask.judul}"`,
      });
    }

    revalidatePath(`/admin/tugas/${taskId}`);
    revalidatePath(`/pegawai/tugas/${taskId}`);

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

export async function deleteSubtask({ subtaskId, taskId }: { subtaskId: string; taskId: string }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu.' };
  }

  const hasAccess = await verifyTaskAccess(taskId, profile);
  if (!hasAccess) {
    return { success: false, error: 'Akses ditolak.' };
  }

  try {
    const supabase = (await createClient()) as any;

    const { error } = await supabase
      .from('task_subtasks')
      .delete()
      .eq('id', subtaskId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/admin/tugas/${taskId}`);
    revalidatePath(`/pegawai/tugas/${taskId}`);

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

// ============================================================================
// 4. LAMPIRAN FILE (SUPABASE STORAGE)
// ============================================================================

export async function saveAttachmentRecord({
  taskId,
  fileName,
  fileUrl,
  fileSize,
  fileType,
  kategori,
}: {
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  kategori: 'brief' | 'hasil' | 'umum';
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu.' };
  }

  const hasAccess = await verifyTaskAccess(taskId, profile);
  if (!hasAccess) {
    return { success: false, error: 'Akses ditolak.' };
  }

  try {
    const supabase = (await createClient()) as any;

    const { data: attachment, error } = await supabase
      .from('task_attachments')
      .insert({
        task_id: taskId,
        uploader_id: profile.id,
        file_name: fileName,
        file_url: fileUrl,
        file_size: fileSize,
        file_type: fileType,
        kategori,
      })
      .select('id')
      .single();

    if (error || !attachment) {
      return { success: false, error: error?.message || 'Gagal menyimpan data lampiran.' };
    }

    // Catat ke Log Aktivitas
    const kategoriLabel = kategori === 'brief' ? 'Brief' : kategori === 'hasil' ? 'Hasil Kerja' : 'Umum';
    await recordActivity({
      taskId,
      userId: profile.id,
      actionType: 'attachment_uploaded',
      description: `${profile.nama} mengunggah file ${kategoriLabel}: "${fileName}"`,
    });

    revalidatePath(`/admin/tugas/${taskId}`);
    revalidatePath(`/pegawai/tugas/${taskId}`);

    return { success: true, attachmentId: attachment.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

export async function deleteAttachmentRecord({
  attachmentId,
  taskId,
  filePath,
}: {
  attachmentId: string;
  taskId: string;
  filePath?: string;
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu.' };
  }

  try {
    const supabase = (await createClient()) as any;

    const { data: att } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('id', attachmentId)
      .single();

    if (!att) {
      return { success: false, error: 'Lampiran tidak ditemukan.' };
    }

    // Izin: admin atau uploader
    if (profile.role !== 'admin' && att.uploader_id !== profile.id) {
      return { success: false, error: 'Akses ditolak: Anda hanya dapat menghapus lampiran yang Anda unggah sendiri.' };
    }

    // Hapus dari Storage jika ada path
    if (filePath) {
      await supabase.storage.from('task-attachments').remove([filePath]);
    }

    // Hapus dari database
    const { error } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Catat aktivitas
    await recordActivity({
      taskId,
      userId: profile.id,
      actionType: 'attachment_deleted',
      description: `${profile.nama} menghapus lampiran: "${att.file_name}"`,
    });

    revalidatePath(`/admin/tugas/${taskId}`);
    revalidatePath(`/pegawai/tugas/${taskId}`);

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

// ============================================================================
// 5. TIME TRACKING (TIMER & INPUT MANUAL)
// Rule: HANYA SATU TIMER AKTIF PER PEGAWAI!
// ============================================================================

/**
 * Mulai Timer untuk tugas tertentu.
 * Jika pegawai sedang memiliki timer berjalan di tugas lain, otomatis hentikan timer sebelumnya terlebih dahulu.
 */
export async function startTaskTimer({ taskId }: { taskId: string }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu.' };
  }

  const hasAccess = await verifyTaskAccess(taskId, profile);
  if (!hasAccess) {
    return { success: false, error: 'Akses ditolak.' };
  }

  try {
    const supabase = (await createClient()) as any;
    const now = new Date();

    // 1. Cek apakah user sudah punya timer berjalan di tugas apapun
    const { data: activeTimers } = await supabase
      .from('task_time_logs')
      .select('id, task_id, started_at')
      .eq('user_id', profile.id)
      .eq('is_running', true);

    if (activeTimers && activeTimers.length > 0) {
      for (const running of activeTimers) {
        // Hitung durasi berjalan
        const startTime = new Date(running.started_at);
        const diffMinutes = Math.max(1, Math.round((now.getTime() - startTime.getTime()) / 60000));

        await supabase
          .from('task_time_logs')
          .update({
            is_running: false,
            ended_at: now.toISOString(),
            duration_minutes: diffMinutes,
          })
          .eq('id', running.id);

        await recordActivity({
          taskId: running.task_id,
          userId: profile.id,
          actionType: 'timer_auto_stopped',
          description: `${profile.nama} timer otomatis dihentikan (${diffMinutes} menit) karena memulai pekerjaan baru`,
        });
      }
    }

    // 2. Buat timer baru yang berjalan
    const { data: newTimer, error } = await supabase
      .from('task_time_logs')
      .insert({
        task_id: taskId,
        user_id: profile.id,
        started_at: now.toISOString(),
        is_running: true,
        duration_minutes: 0,
      })
      .select('id')
      .single();

    if (error || !newTimer) {
      return { success: false, error: error?.message || 'Gagal memulai timer.' };
    }

    // Catat ke Log Aktivitas
    await recordActivity({
      taskId,
      userId: profile.id,
      actionType: 'timer_started',
      description: `${profile.nama} mulai mencatat waktu kerja (Timer aktif)`,
    });

    revalidatePath(`/admin/tugas/${taskId}`);
    revalidatePath(`/pegawai/tugas/${taskId}`);

    return { success: true, timerId: newTimer.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

/**
 * Hentikan Timer yang sedang berjalan
 */
export async function stopTaskTimer({ timeLogId, taskId }: { timeLogId: string; taskId: string }) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu.' };
  }

  try {
    const supabase = (await createClient()) as any;
    const now = new Date();

    const { data: timer } = await supabase
      .from('task_time_logs')
      .select('*')
      .eq('id', timeLogId)
      .single();

    if (!timer) {
      return { success: false, error: 'Log timer tidak ditemukan.' };
    }

    if (profile.role !== 'admin' && timer.user_id !== profile.id) {
      return { success: false, error: 'Akses ditolak: Anda hanya dapat menghentikan timer milik Anda sendiri.' };
    }

    const startTime = new Date(timer.started_at);
    const diffMinutes = Math.max(1, Math.round((now.getTime() - startTime.getTime()) / 60000));

    const { error } = await supabase
      .from('task_time_logs')
      .update({
        is_running: false,
        ended_at: now.toISOString(),
        duration_minutes: diffMinutes,
      })
      .eq('id', timeLogId);

    if (error) {
      return { success: false, error: error.message };
    }

    // Catat ke Log Aktivitas
    const jam = Math.floor(diffMinutes / 60);
    const sisaMenit = diffMinutes % 60;
    const durasiText = jam > 0 ? `${jam} jam ${sisaMenit} menit` : `${diffMinutes} menit`;

    await recordActivity({
      taskId,
      userId: profile.id,
      actionType: 'timer_stopped',
      description: `${profile.nama} menghentikan timer (Durasi: ${durasiText})`,
    });

    revalidatePath(`/admin/tugas/${taskId}`);
    revalidatePath(`/pegawai/tugas/${taskId}`);

    return { success: true, durationMinutes: diffMinutes };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

/**
 * Input waktu kerja manual
 */
export async function logManualTime({
  taskId,
  durationMinutes,
  catatan,
  tanggal,
}: {
  taskId: string;
  durationMinutes: number;
  catatan?: string;
  tanggal?: string;
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { success: false, error: 'Silakan login terlebih dahulu.' };
  }

  if (durationMinutes <= 0) {
    return { success: false, error: 'Durasi waktu harus lebih dari 0 menit.' };
  }

  const hasAccess = await verifyTaskAccess(taskId, profile);
  if (!hasAccess) {
    return { success: false, error: 'Akses ditolak.' };
  }

  try {
    const supabase = (await createClient()) as any;
    const logDate = tanggal ? new Date(tanggal) : new Date();

    const { error } = await supabase.from('task_time_logs').insert({
      task_id: taskId,
      user_id: profile.id,
      started_at: logDate.toISOString(),
      ended_at: logDate.toISOString(),
      duration_minutes: durationMinutes,
      is_running: false,
      catatan: catatan?.trim() || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const jam = Math.floor(durationMinutes / 60);
    const sisaMenit = durationMinutes % 60;
    const durasiText = jam > 0 ? `${jam} jam ${sisaMenit} menit` : `${durationMinutes} menit`;

    await recordActivity({
      taskId,
      userId: profile.id,
      actionType: 'time_logged_manual',
      description: `${profile.nama} menambahkan waktu manual: ${durasiText}${catatan ? ` (${catatan.trim()})` : ''}`,
    });

    revalidatePath(`/admin/tugas/${taskId}`);
    revalidatePath(`/pegawai/tugas/${taskId}`);

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}
