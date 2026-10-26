import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';
import { generateNotificationEmailHtml } from '@/lib/email/templates';

export {
  determineReminderStage,
  type ReminderStage,
  type StageCalculationResult,
} from './reminder-calculator';
import { determineReminderStage } from './reminder-calculator';

export interface ProcessRemindersResult {
  evaluatedTasksCount: number;
  notificationsSent: number;
  emailsSent: number;
  skippedDuplicates: number;
  logs: string[];
}

/**
 * Mesin utama pemroses pengingat otomatis (dipanggil oleh Scheduler/Cron).
 */
export async function processAutomatedReminders(
  now: Date = new Date()
): Promise<ProcessRemindersResult> {
  const supabase = (createAdminClient()) as any;
  const logs: string[] = [];
  let notificationsSent = 0;
  let emailsSent = 0;
  let skippedDuplicates = 0;

  // 1. Ambil pengaturan sistem notifikasi
  const { data: settingsData } = await supabase
    .from('system_notification_settings')
    .select('*')
    .single();

  const settings = settingsData || {
    stage_h3_enabled: true,
    stage_h1_enabled: true,
    stage_3h_enabled: true,
    stage_overdue_enabled: true,
    cc_admin_urgent: true,
  };

  // 2. Ambil seluruh tugas aktif (bukan Selesai dan bukan soft-delete)
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select(`
      *,
      task_assignees (
        user_id,
        profiles (
          id,
          nama,
          email,
          role
        )
      )
    `)
    .is('deleted_at', null)
    .neq('status', 'Selesai');

  if (tasksError || !tasks) {
    logs.push(`Gagal mengambil data tugas: ${tasksError?.message}`);
    return {
      evaluatedTasksCount: 0,
      notificationsSent: 0,
      emailsSent: 0,
      skippedDuplicates: 0,
      logs,
    };
  }

  // 3. Ambil daftar admin untuk tembusan tugas Urgent / Tinggi
  const { data: admins } = await supabase
    .from('profiles')
    .select('id, nama, email')
    .eq('role', 'admin')
    .eq('status_aktif', true)
    .is('deleted_at', null);

  const activeAdmins = admins || [];

  const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // 4. Evaluasi setiap tugas
  for (const task of tasks) {
    const stageInfo = determineReminderStage(task.deadline, now);
    if (!stageInfo) continue;

    // Periksa apakah tahap ini diaktifkan di pengaturan sistem
    if (stageInfo.stage === 'h3' && !settings.stage_h3_enabled) continue;
    if (stageInfo.stage === 'h1' && !settings.stage_h1_enabled) continue;
    if (stageInfo.stage === '3h' && !settings.stage_3h_enabled) continue;
    if (stageInfo.stage === 'overdue' && !settings.stage_overdue_enabled) continue;

    const deadlineFormattedWIB = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(task.deadline)) + ' WIB';

    // Tentukan daftar penerima:
    // a. Pegawai yang ditugaskan
    const assignees = (task.task_assignees || []).map((ta: any) => ta.profiles).filter(Boolean);
    const assigneeNames = assignees.map((a: any) => a.nama).join(', ') || 'Belum ditugaskan';

    // b. Tembusan admin jika prioritas Urgent atau Tinggi
    const isHighPriority = task.prioritas === 'Urgent' || task.prioritas === 'Tinggi';
    const shouldCcAdmin = isHighPriority && settings.cc_admin_urgent;

    const recipientsMap = new Map<string, { id: string; nama: string; email: string; isAdminCc: boolean }>();

    for (const a of assignees) {
      recipientsMap.set(a.id, { id: a.id, nama: a.nama, email: a.email, isAdminCc: false });
    }

    if (shouldCcAdmin) {
      for (const admin of activeAdmins) {
        if (!recipientsMap.has(admin.id)) {
          recipientsMap.set(admin.id, {
            id: admin.id,
            nama: admin.nama,
            email: admin.email,
            isAdminCc: true,
          });
        }
      }
    }

    // Kirim notifikasi ke masing-masing penerima
    for (const recipient of Array.from(recipientsMap.values())) {
      // 5. Cek preferensi channel pengguna
      const { data: pref } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', recipient.id)
        .maybeSingle();

      const inAppEnabled = pref ? pref.in_app_enabled : true;
      const emailEnabled = pref ? pref.email_enabled : true;

      // Susun pesan notifikasi
      let notifTitle = '';
      let notifMessage = '';
      const notifType = `deadline_${stageInfo.stage}`;

      if (stageInfo.stage === 'h3') {
        notifTitle = recipient.isAdminCc
          ? `[Tembusan Admin H-3] ${task.judul}`
          : `[Pengingat H-3] Batas Waktu: ${task.judul}`;
        notifMessage = recipient.isAdminCc
          ? `Tugas "${task.judul}" (${task.klien_proyek}) berprioritas ${task.prioritas} (PJ: ${assigneeNames}) memiliki deadline pada ${deadlineFormattedWIB} (tersisa 3 hari).`
          : `Tugas "${task.judul}" (${task.klien_proyek}) memiliki batas waktu pada ${deadlineFormattedWIB} (tersisa 3 hari lagi).`;
      } else if (stageInfo.stage === 'h1') {
        notifTitle = recipient.isAdminCc
          ? `[Tembusan Admin H-1] Batas Waktu Besok: ${task.judul}`
          : `[Peringatan H-1] Batas Waktu Besok: ${task.judul}`;
        notifMessage = recipient.isAdminCc
          ? `Peringatan: Batas waktu tugas "${task.judul}" (${task.klien_proyek}) berprioritas ${task.prioritas} (PJ: ${assigneeNames}) tersisa 24 jam (${deadlineFormattedWIB}).`
          : `Peringatan: Batas waktu tugas "${task.judul}" (${task.klien_proyek}) tersisa 24 jam lagi (${deadlineFormattedWIB}). Pastikan pengerjaan lancar.`;
      } else if (stageInfo.stage === '3h') {
        notifTitle = recipient.isAdminCc
          ? `[MENDESAK 3 JAM] ${task.judul}`
          : `[MENDESAK - 3 Jam] Batas Waktu Segera Berakhir: ${task.judul}`;
        notifMessage = recipient.isAdminCc
          ? `Mendesak: Batas waktu tugas "${task.judul}" (${task.klien_proyek}) tersisa kurang dari 3 jam (${deadlineFormattedWIB})! PJ: ${assigneeNames}.`
          : `PENTING: Batas waktu tugas "${task.judul}" tersisa kurang dari 3 jam (${deadlineFormattedWIB})! Segera serahkan link hasil karya.`;
      } else if (stageInfo.stage === 'overdue') {
        notifTitle = recipient.isAdminCc
          ? `[TERLAMBAT] ${task.judul}`
          : `[TERLAMBAT] Batas Waktu Terlewati: ${task.judul}`;
        notifMessage = recipient.isAdminCc
          ? `Perhatian Admin: Tugas "${task.judul}" (${task.klien_proyek}) telah melewati batas waktu pengerjaan (${deadlineFormattedWIB}). PJ: ${assigneeNames}.`
          : `PERHATIAN: Tugas "${task.judul}" telah melewati batas waktu (${deadlineFormattedWIB}). Harap segera laporkan kendala atau serahkan hasil kerja.`;
      }

      // 6. CHANNEL IN-APP NOTIFICATION
      if (inAppEnabled) {
        // Cek notification_logs untuk in_app
        const { data: existingInApp } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('task_id', task.id)
          .eq('user_id', recipient.id)
          .eq('stage', stageInfo.stageKey)
          .eq('channel', 'in_app')
          .maybeSingle();

        if (existingInApp) {
          skippedDuplicates++;
        } else {
          // Buat notifikasi in-app
          const { error: notifInsertError } = await supabase
            .from('notifications')
            .insert({
              user_id: recipient.id,
              tipe: notifType,
              judul: notifTitle,
              pesan: notifMessage,
              task_id: task.id,
              is_read: false,
            });

          if (!notifInsertError) {
            // Catat log
            await supabase.from('notification_logs').insert({
              task_id: task.id,
              user_id: recipient.id,
              stage: stageInfo.stageKey,
              channel: 'in_app',
            });
            notificationsSent++;
            logs.push(`[In-App Sent] ${recipient.nama} &larr; ${notifTitle}`);
          }
        }
      }

      // 7. CHANNEL EMAIL RESEND
      if (emailEnabled && recipient.email) {
        const { data: existingEmail } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('task_id', task.id)
          .eq('user_id', recipient.id)
          .eq('stage', stageInfo.stageKey)
          .eq('channel', 'email')
          .maybeSingle();

        if (existingEmail) {
          skippedDuplicates++;
        } else {
          const detailUrl = recipient.isAdminCc
            ? `${appBaseUrl}/admin/tugas/${task.id}`
            : `${appBaseUrl}/pegawai/tugas/${task.id}`;

          const htmlContent = generateNotificationEmailHtml({
            recipientName: recipient.nama,
            subject: notifTitle,
            heading: notifTitle,
            badgeLabel: stageInfo.badgeLabel,
            badgeColor: stageInfo.badgeColor,
            message: notifMessage,
            taskTitle: task.judul,
            clientName: task.klien_proyek,
            priority: task.prioritas,
            deadlineWIB: deadlineFormattedWIB,
            ctaUrl: detailUrl,
          });

          const emailRes = await sendEmail({
            to: recipient.email,
            subject: notifTitle,
            html: htmlContent,
          });

          if (emailRes.success) {
            await supabase.from('notification_logs').insert({
              task_id: task.id,
              user_id: recipient.id,
              stage: stageInfo.stageKey,
              channel: 'email',
            });
            emailsSent++;
            logs.push(`[Email Sent] ${recipient.email} &larr; ${notifTitle}`);
          }
        }
      }
    }
  }

  return {
    evaluatedTasksCount: tasks.length,
    notificationsSent,
    emailsSent,
    skippedDuplicates,
    logs,
  };
}
