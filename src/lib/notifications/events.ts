import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';
import { generateNotificationEmailHtml } from '@/lib/email/templates';
import type { Task } from '@/types/database';

function formatWIB(dateStr: string) {
  try {
    return (
      new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }).format(new Date(dateStr)) + ' WIB'
    );
  } catch {
    return dateStr;
  }
}

/**
 * Helper untuk mengirim notifikasi kejadian (in-app dan email sesuai preferensi)
 */
async function dispatchEventNotification({
  recipientIds,
  tipe,
  judul,
  pesan,
  taskId,
  taskTitle,
  clientName,
  priority,
  deadline,
  isRecipientAdmin = false,
}: {
  recipientIds: string[];
  tipe: string;
  judul: string;
  pesan: string;
  taskId: string;
  taskTitle: string;
  clientName: string;
  priority: string;
  deadline: string;
  isRecipientAdmin?: boolean;
}) {
  if (recipientIds.length === 0) return;

  const supabase = (createAdminClient()) as any;
  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const deadlineWIB = formatWIB(deadline);

  // Ambil data profil penerima
  const { data: recipients } = await supabase
    .from('profiles')
    .select('id, nama, email')
    .in('id', recipientIds);

  if (!recipients) return;

  for (const recipient of recipients) {
    // Ambil preferensi channel
    const { data: pref } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', recipient.id)
      .maybeSingle();

    const inAppEnabled = pref ? pref.in_app_enabled : true;
    const emailEnabled = pref ? pref.email_enabled : true;

    // 1. Simpan In-App
    if (inAppEnabled) {
      await supabase.from('notifications').insert({
        user_id: recipient.id,
        tipe,
        judul,
        pesan,
        task_id: taskId,
        is_read: false,
      });
    }

    // 2. Kirim Email
    if (emailEnabled && recipient.email) {
      const detailUrl = isRecipientAdmin
        ? `${appBaseUrl}/admin/tugas/${taskId}`
        : `${appBaseUrl}/pegawai/tugas/${taskId}`;

      const html = generateNotificationEmailHtml({
        recipientName: recipient.nama,
        subject: judul,
        heading: judul,
        badgeLabel: 'AKTIVITAS TUGAS',
        badgeColor: '#4f46e5',
        message: pesan,
        taskTitle,
        clientName,
        priority,
        deadlineWIB,
        ctaUrl: detailUrl,
      });

      await sendEmail({
        to: recipient.email,
        subject: judul,
        html,
      });
    }
  }

  // 3. Kirim Realtime Broadcast instan ke seluruh perangkat mobile / desktop yang sedang terhubung
  try {
    const broadcastChannel = supabase.channel('task-live-broadcast');
    broadcastChannel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await broadcastChannel.send({
          type: 'broadcast',
          event: 'new_notification',
          payload: {
            recipientIds,
            tipe,
            judul,
            pesan,
            taskId,
            taskTitle,
            clientName,
            priority,
            deadline,
          },
        });
        setTimeout(() => supabase.removeChannel(broadcastChannel), 2000);
      }
    });
  } catch (err) {
    console.warn('Realtime broadcast dispatch error:', err);
  }
}

/**
 * 1. Kejadian: Tugas Baru Dibuat
 */
export async function notifyTaskCreated(task: Task, assigneeIds: string[]) {
  if (!assigneeIds || assigneeIds.length === 0) return;

  const judul = `[Tugas Baru] ${task.judul}`;
  const pesan = `Anda telah ditugaskan pada pekerjaan baru: "${task.judul}" (${task.jenis_pekerjaan}) untuk klien ${task.klien_proyek}. Batas waktu: ${formatWIB(task.deadline)}.`;

  await dispatchEventNotification({
    recipientIds: assigneeIds,
    tipe: 'tugas_baru',
    judul,
    pesan,
    taskId: task.id,
    taskTitle: task.judul,
    clientName: task.klien_proyek,
    priority: task.prioritas,
    deadline: task.deadline,
  });
}

/**
 * 2. Kejadian: Deadline Tugas Diubah
 */
export async function notifyDeadlineChanged(
  task: Task,
  oldDeadline: string,
  newDeadline: string,
  assigneeIds: string[]
) {
  if (!assigneeIds || assigneeIds.length === 0) return;

  const judul = `[Perubahan Deadline] ${task.judul}`;
  const pesan = `Batas waktu pengerjaan tugas "${task.judul}" telah diubah dari ${formatWIB(oldDeadline)} menjadi ${formatWIB(newDeadline)}.`;

  await dispatchEventNotification({
    recipientIds: assigneeIds,
    tipe: 'deadline_diubah',
    judul,
    pesan,
    taskId: task.id,
    taskTitle: task.judul,
    clientName: task.klien_proyek,
    priority: task.prioritas,
    deadline: newDeadline,
  });
}

/**
 * 3. Kejadian: Detail Tugas Diubah
 */
export async function notifyTaskUpdated(task: Task, assigneeIds: string[]) {
  if (!assigneeIds || assigneeIds.length === 0) return;

  const judul = `[Pembaruan Tugas] ${task.judul}`;
  const pesan = `Terdapat pembaruan informasi atau brief pada tugas "${task.judul}" (${task.klien_proyek}). Silakan periksa detail terbaru.`;

  await dispatchEventNotification({
    recipientIds: assigneeIds,
    tipe: 'tugas_diubah',
    judul,
    pesan,
    taskId: task.id,
    taskTitle: task.judul,
    clientName: task.klien_proyek,
    priority: task.prioritas,
    deadline: task.deadline,
  });
}

/**
 * 4. Kejadian: Hasil Pekerjaan Dikirim untuk Review
 * Jika dibuat oleh PEP: langsung dikirimkan ke PEP untuk ditinjau (tanpa workflow persetujuan admin)
 * Jika dibuat oleh Admin: dikirimkan ke Admin
 */
export async function notifyWorkSubmitted(task: Task, employeeName: string) {
  const supabase = (createAdminClient()) as any;

  let recipientIds: string[] = [];

  // Jika tugas dibuat oleh PEP, kirimkan notifikasi langsung ke PEP yang bersangkutan
  if (task.created_by) {
    const { data: creator } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', task.created_by)
      .maybeSingle();

    if (creator && creator.role === 'pep') {
      recipientIds = [creator.id];
    }
  }

  // Jika bukan dibuat oleh PEP, kirimkan ke Admin
  if (recipientIds.length === 0) {
    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('status_aktif', true);

    recipientIds = (admins || []).map((a: any) => a.id);
  }

  if (recipientIds.length === 0) return;

  const judul = `[Hasil Diserahkan] ${task.judul}`;
  const pesan = `${employeeName} telah menyerahkan hasil karya untuk tugas "${task.judul}" (${task.klien_proyek}). Tautan hasil siap ditinjau untuk persetujuan atau revisi.`;

  await dispatchEventNotification({
    recipientIds,
    tipe: 'hasil_review',
    judul,
    pesan,
    taskId: task.id,
    taskTitle: task.judul,
    clientName: task.klien_proyek,
    priority: task.prioritas,
    deadline: task.deadline,
    isRecipientAdmin: true,
  });
}

/**
 * 5. Kejadian: Status Direview oleh Admin (Selesai atau Revisi)
 */
export async function notifyTaskReviewed(
  task: Task,
  newStatus: 'Selesai' | 'Revisi',
  assigneeIds: string[],
  catatanRevisi?: string,
  reviewerRole?: string
) {
  if (!assigneeIds || assigneeIds.length === 0) return;

  const reviewerLabel = reviewerRole === 'pep' ? 'PEP (Siaran)' : 'Administrator';
  const isApproved = newStatus === 'Selesai';
  const judul = isApproved
    ? `[Tugas Selesai & Disetujui] ${task.judul}`
    : `[Permintaan Revisi] ${task.judul}`;

  const pesan = isApproved
    ? `Selamat! Pekerjaan "${task.judul}" untuk klien ${task.klien_proyek} telah ditinjau dan disetujui (Selesai) oleh ${reviewerLabel}.`
    : `${reviewerLabel} meminta revisi untuk tugas "${task.judul}" (${task.klien_proyek}). Catatan revisi: "${catatanRevisi || 'Silakan cek detail tugas'}". Segera perbaiki hasil karya.`;

  await dispatchEventNotification({
    recipientIds: assigneeIds,
    tipe: isApproved ? 'tugas_selesai' : 'revisi_diminta',
    judul,
    pesan,
    taskId: task.id,
    taskTitle: task.judul,
    clientName: task.klien_proyek,
    priority: task.prioritas,
    deadline: task.deadline,
  });
}

/**
 * 6. Kejadian: Mention dalam Komentar Diskusi
 */
export async function notifyCommentMention({
  taskId,
  taskTitle,
  clientName,
  senderName,
  mentionedUserIds,
  commentText,
  priority,
  deadline,
}: {
  taskId: string;
  taskTitle: string;
  clientName: string;
  senderName: string;
  mentionedUserIds: string[];
  commentText: string;
  priority: string;
  deadline: string;
}) {
  if (!mentionedUserIds || mentionedUserIds.length === 0) return;

  const judul = `[Mention] ${senderName} menyebut Anda dalam diskusi`;
  const preview = commentText.length > 80 ? commentText.substring(0, 77) + '...' : commentText;
  const pesan = `${senderName} menyebut Anda dalam diskusi tugas "${taskTitle}" (${clientName}): "${preview}"`;

  await dispatchEventNotification({
    recipientIds: mentionedUserIds,
    tipe: 'mention',
    judul,
    pesan,
    taskId,
    taskTitle,
    clientName,
    priority,
    deadline,
  });
}
