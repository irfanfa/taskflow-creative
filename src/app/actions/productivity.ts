'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyTaskCreated } from '@/lib/notifications/events';
import type {
  TaskTemplate,
  RecurringTask,
  RecurringFrequency,
  TaskPriority,
  TechnicalSpecs,
} from '@/types/database';

// ============================================================================
// 1. TEMPLATE TUGAS (TASK TEMPLATES)
// ============================================================================

export async function getTaskTemplates(): Promise<TaskTemplate[]> {
  try {
    const supabase = (await createClient()) as any;
    const { data, error } = await supabase
      .from('task_templates')
      .select('*')
      .order('nama', { ascending: true });

    if (error) {
      console.error('Error getTaskTemplates:', error);
      return [];
    }

    return (data as TaskTemplate[]) || [];
  } catch (err) {
    console.error('Error getTaskTemplates:', err);
    return [];
  }
}

export async function createTaskTemplate(formData: {
  nama: string;
  deskripsi?: string;
  jenis_pekerjaan: string;
  spesifikasi_teknis?: TechnicalSpecs;
  default_subtasks?: string[];
  prioritas_default?: TaskPriority;
}) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Hanya administrator yang berwenang membuat template.' };
  }

  const { nama, deskripsi, jenis_pekerjaan, spesifikasi_teknis = {}, default_subtasks = [], prioritas_default = 'Sedang' } = formData;
  if (!nama || !jenis_pekerjaan) {
    return { success: false, error: 'Nama template dan jenis pekerjaan wajib diisi.' };
  }

  try {
    const supabase = (await createClient()) as any;
    const { data, error } = await supabase
      .from('task_templates')
      .insert({
        nama: nama.trim(),
        deskripsi: deskripsi?.trim() || null,
        jenis_pekerjaan,
        spesifikasi_teknis,
        default_subtasks: default_subtasks.filter((s) => s.trim().length > 0),
        prioritas_default,
        created_by: profile.id,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/pengaturan');
    revalidatePath('/admin/tugas/baru');
    return { success: true, templateId: data.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

export async function updateTaskTemplate(formData: {
  id: string;
  nama: string;
  deskripsi?: string;
  jenis_pekerjaan: string;
  spesifikasi_teknis?: TechnicalSpecs;
  default_subtasks?: string[];
  prioritas_default?: TaskPriority;
}) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Hanya administrator yang berwenang mengubah template.' };
  }

  const { id, nama, deskripsi, jenis_pekerjaan, spesifikasi_teknis = {}, default_subtasks = [], prioritas_default = 'Sedang' } = formData;

  try {
    const supabase = (await createClient()) as any;
    const { error } = await supabase
      .from('task_templates')
      .update({
        nama: nama.trim(),
        deskripsi: deskripsi?.trim() || null,
        jenis_pekerjaan,
        spesifikasi_teknis,
        default_subtasks: default_subtasks.filter((s) => s.trim().length > 0),
        prioritas_default,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/pengaturan');
    revalidatePath('/admin/tugas/baru');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

export async function deleteTaskTemplate(id: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Hanya administrator yang berwenang menghapus template.' };
  }

  try {
    const supabase = (await createClient()) as any;
    const { error } = await supabase.from('task_templates').delete().eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/pengaturan');
    revalidatePath('/admin/tugas/baru');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

// ============================================================================
// 2. TUGAS BERULANG (RECURRING TASKS)
// ============================================================================

export async function getRecurringTasks(): Promise<RecurringTask[]> {
  try {
    const supabase = (await createClient()) as any;
    const { data, error } = await supabase
      .from('recurring_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getRecurringTasks:', error);
      return [];
    }

    return (data as RecurringTask[]) || [];
  } catch (err) {
    console.error('Error getRecurringTasks:', err);
    return [];
  }
}

export async function createRecurringTask(formData: {
  judul: string;
  deskripsi?: string;
  jenis_pekerjaan: string;
  klien_proyek: string;
  prioritas: TaskPriority;
  spesifikasi_teknis?: TechnicalSpecs;
  link_referensi?: string;
  frekuensi: RecurringFrequency;
  assignee_ids: string[];
  default_subtasks?: string[];
  jam_deadline?: string;
  hari_dalam_minggu?: number;
  tanggal_dalam_bulan?: number;
  tanggal_mulai: string;
  tanggal_berakhir?: string;
}) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Hanya administrator yang berwenang mengatur tugas berulang.' };
  }

  const {
    judul,
    deskripsi,
    jenis_pekerjaan,
    klien_proyek,
    prioritas,
    spesifikasi_teknis = {},
    link_referensi,
    frekuensi,
    assignee_ids = [],
    default_subtasks = [],
    jam_deadline = '17:00:00',
    hari_dalam_minggu,
    tanggal_dalam_bulan,
    tanggal_mulai,
    tanggal_berakhir,
  } = formData;

  if (!judul || !jenis_pekerjaan || !klien_proyek || !frekuensi || !tanggal_mulai) {
    return { success: false, error: 'Harap lengkapi semua kolom wajib.' };
  }

  try {
    const supabase = (await createClient()) as any;
    const { data, error } = await supabase
      .from('recurring_tasks')
      .insert({
        judul: judul.trim(),
        deskripsi: deskripsi?.trim() || null,
        jenis_pekerjaan,
        klien_proyek: klien_proyek.trim(),
        prioritas,
        spesifikasi_teknis,
        link_referensi: link_referensi?.trim() || null,
        frekuensi,
        assignee_ids,
        default_subtasks: default_subtasks.filter((s) => s.trim().length > 0),
        jam_deadline,
        hari_dalam_minggu: frekuensi === 'mingguan' ? hari_dalam_minggu : null,
        tanggal_dalam_bulan: frekuensi === 'bulanan' ? tanggal_dalam_bulan : null,
        tanggal_mulai,
        tanggal_berakhir: tanggal_berakhir || null,
        is_active: true,
        created_by: profile.id,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/pengaturan');
    return { success: true, recurringId: data.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

export async function toggleRecurringTask(id: string, isActive: boolean) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Hanya administrator yang berwenang.' };
  }

  try {
    const supabase = (await createClient()) as any;
    const { error } = await supabase
      .from('recurring_tasks')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

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

export async function deleteRecurringTask(id: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    return { success: false, error: 'Hanya administrator yang berwenang.' };
  }

  try {
    const supabase = (await createClient()) as any;
    const { error } = await supabase.from('recurring_tasks').delete().eq('id', id);

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
 * Scheduler: Proses pembuatan tugas berulang otomatis untuk hari ini
 */
export async function processRecurringTasksEngine(targetDateStr?: string) {
  const supabase = createAdminClient() as any;

  // Dapatkan tanggal target dalam WIB
  const now = targetDateStr ? new Date(targetDateStr) : new Date();
  const wibFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayWib = wibFormatter.format(now); // YYYY-MM-DD
  const dateObj = new Date(todayWib + 'T00:00:00+07:00');
  const dayOfWeek = dateObj.getDay(); // 0 = Minggu, 1 = Senin, ...
  const dayOfMonth = dateObj.getDate(); // 1 - 31

  // Ambil semua recurring_tasks aktif
  const { data: recurringList, error } = await supabase
    .from('recurring_tasks')
    .select('*')
    .eq('is_active', true)
    .lte('tanggal_mulai', todayWib);

  if (error || !recurringList) {
    console.error('Error fetching recurring_tasks:', error);
    return { processed: 0, createdTasks: [] };
  }

  const createdTasks: string[] = [];

  for (const item of recurringList) {
    // 1. Cek tanggal berakhir
    if (item.tanggal_berakhir && item.tanggal_berakhir < todayWib) {
      continue;
    }

    // 2. Cek apakah sudah pernah dibuat untuk hari ini
    if (item.terakhir_dibuat === todayWib) {
      continue;
    }

    // 3. Cek kesesuaian pola frekuensi
    let isDue = false;
    if (item.frekuensi === 'harian') {
      isDue = true;
    } else if (item.frekuensi === 'mingguan') {
      isDue = item.hari_dalam_minggu === dayOfWeek;
    } else if (item.frekuensi === 'bulanan') {
      isDue = item.tanggal_dalam_bulan === dayOfMonth;
    }

    if (!isDue) continue;

    // 4. Generate tugas baru
    const timePart = item.jam_deadline || '17:00:00';
    const deadlineIso = `${todayWib}T${timePart}+07:00`;

    const { data: newTask, error: taskErr } = await supabase
      .from('tasks')
      .insert({
        judul: `${item.judul} (${new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' }).format(dateObj)})`,
        deskripsi: item.deskripsi,
        jenis_pekerjaan: item.jenis_pekerjaan,
        klien_proyek: item.klien_proyek,
        prioritas: item.prioritas,
        tanggal_mulai: `${todayWib}T09:00:00+07:00`,
        deadline: deadlineIso,
        status: 'Belum Dimulai',
        spesifikasi_teknis: item.spesifikasi_teknis || {},
        link_referensi: item.link_referensi,
        created_by: item.created_by,
      })
      .select('id')
      .single();

    if (taskErr || !newTask) {
      console.error('Error inserting generated recurring task:', taskErr);
      continue;
    }

    createdTasks.push(newTask.id);

    // 5. Hubungkan assignees
    if (item.assignee_ids && item.assignee_ids.length > 0) {
      const assigneesPayload = item.assignee_ids.map((userId: string) => ({
        task_id: newTask.id,
        user_id: userId,
      }));
      await supabase.from('task_assignees').insert(assigneesPayload);

      // Kirim notifikasi tugas baru
      notifyTaskCreated(
        {
          id: newTask.id,
          judul: item.judul,
          jenis_pekerjaan: item.jenis_pekerjaan,
          klien_proyek: item.klien_proyek,
          prioritas: item.prioritas,
          deadline: deadlineIso,
        } as any,
        item.assignee_ids
      ).catch((e) => console.error('Error notifyTaskCreated recurring:', e));
    }

    // 6. Masukkan subtasks jika ada
    if (item.default_subtasks && item.default_subtasks.length > 0) {
      const subtasksPayload = item.default_subtasks.map((stTitle: string, index: number) => ({
        task_id: newTask.id,
        judul: stTitle,
        urutan: index,
        is_completed: false,
      }));
      await supabase.from('task_subtasks').insert(subtasksPayload);
    }

    // 7. Catat aktivitas
    await supabase.from('task_activities').insert({
      task_id: newTask.id,
      user_id: item.created_by || '00000000-0000-0000-0000-000000000000',
      action_type: 'task_created_recurring',
      description: `Tugas otomatis dibuat dari jadwal perulangan (${item.frekuensi})`,
    });

    // 8. Update terakhir_dibuat pada recurring_tasks
    await supabase
      .from('recurring_tasks')
      .update({
        terakhir_dibuat: todayWib,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id);
  }

  return { processed: createdTasks.length, createdTasks };
}

// ============================================================================
// 3. BEBAN KERJA PEGAWAI (WORKLOAD LIMIT & WARNING)
// ============================================================================

export async function getEmployeeWorkloads() {
  try {
    const supabase = createAdminClient() as any;

    // 1. Ambil batas maksimal dari pengaturan
    const { data: settings } = await supabase
      .from('system_notification_settings')
      .select('max_active_tasks_per_employee')
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .maybeSingle();

    const maxLimit: number = settings?.max_active_tasks_per_employee ?? 4;

    // 2. Hitung jumlah tugas aktif (status != 'Selesai' and deleted_at IS NULL) per pegawai
    const { data: activeTasks } = await supabase
      .from('tasks')
      .select(`
        id,
        status,
        task_assignees (
          user_id
        )
      `)
      .neq('status', 'Selesai')
      .is('deleted_at', null);

    const workloadMap: Record<string, number> = {};

    (activeTasks || []).forEach((t: any) => {
      (t.task_assignees || []).forEach((ta: any) => {
        workloadMap[ta.user_id] = (workloadMap[ta.user_id] || 0) + 1;
      });
    });

    return { maxLimit, workloadMap, workloads: workloadMap };
  } catch (err) {
    console.error('Error getEmployeeWorkloads:', err);
    return { maxLimit: 4, workloadMap: {}, workloads: {} };
  }
}

// ============================================================================
// 4. LOG AKTIVITAS GLOBAL (GLOBAL AUDIT LOG)
// ============================================================================

export async function getGlobalActivities({
  userId,
  actionType,
  startDate,
  endDate,
  query,
  limit = 100,
}: {
  userId?: string;
  actionType?: string;
  startDate?: string;
  endDate?: string;
  query?: string;
  limit?: number;
}) {
  try {
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('task_activities')
      .select(`
        *,
        user:profiles(id, nama, email, role, foto),
        task:tasks(id, judul, klien_proyek, jenis_pekerjaan)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId && userId !== 'Semua') {
      queryBuilder = queryBuilder.eq('user_id', userId);
    }
    if (actionType && actionType !== 'Semua') {
      queryBuilder = queryBuilder.eq('action_type', actionType);
    }
    if (startDate) {
      queryBuilder = queryBuilder.gte('created_at', `${startDate}T00:00:00Z`);
    }
    if (endDate) {
      queryBuilder = queryBuilder.lte('created_at', `${endDate}T23:59:59Z`);
    }

    const { data, error } = await queryBuilder;

    if (error) {
      console.error('Error getGlobalActivities:', error);
      return [];
    }

    let results = data || [];
    if (query && query.trim()) {
      const q = query.toLowerCase();
      results = results.filter(
        (item: any) =>
          item.description?.toLowerCase().includes(q) ||
          item.task?.judul?.toLowerCase().includes(q) ||
          item.task?.klien_proyek?.toLowerCase().includes(q) ||
          item.user?.nama?.toLowerCase().includes(q)
      );
    }

    return results;
  } catch (err) {
    console.error('Error getGlobalActivities:', err);
    return [];
  }
}
