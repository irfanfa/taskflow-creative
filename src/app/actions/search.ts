'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import type { Task, Profile } from '@/types/database';

export interface GlobalSearchResult {
  tasks: (Task & { assigneesCount?: number })[];
  employees: Profile[];
  clients: { name: string; taskCount: number }[];
}

export async function globalSearch(query: string): Promise<GlobalSearchResult> {
  if (!query || query.trim().length < 2) {
    return { tasks: [], employees: [], clients: [] };
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    return { tasks: [], employees: [], clients: [] };
  }

  const q = query.trim().toLowerCase();
  const supabase = (await createClient()) as any;

  try {
    // 1. Cari Tugas
    let taskQuery = supabase
      .from('tasks')
      .select('id, judul, jenis_pekerjaan, klien_proyek, prioritas, status, deadline, deleted_at, created_at')
      .is('deleted_at', null)
      .or(`judul.ilike.%${q}%,klien_proyek.ilike.%${q}%,jenis_pekerjaan.ilike.%${q}%,deskripsi.ilike.%${q}%`)
      .order('created_at', { ascending: false })
      .limit(8);

    // Filter berdasarkan role
    if (profile.role === 'pep') {
      taskQuery = taskQuery.eq('created_by', profile.id);
    } else if (profile.role === 'pegawai') {
      const { data: userTasks } = await supabase
        .from('task_assignees')
        .select('task_id')
        .eq('user_id', profile.id);

      const taskIds = (userTasks || []).map((ut: any) => ut.task_id);
      if (taskIds.length === 0) {
        taskQuery = null;
      } else {
        taskQuery = taskQuery.in('id', taskIds);
      }
    }

    const { data: matchedTasks } = taskQuery ? await taskQuery : { data: [] };

    // 2. Cari Pegawai
    const { data: matchedEmployees } = await supabase
      .from('profiles')
      .select('id, nama, email, role, spesialisasi, status_aktif, foto')
      .is('deleted_at', null)
      .or(`nama.ilike.%${q}%,email.ilike.%${q}%,spesialisasi.ilike.%${q}%,role.ilike.%${q}%`)
      .order('nama', { ascending: true })
      .limit(6);

    // 3. Ekstrak Klien yang cocok
    const clientMap: Record<string, number> = {};
    (matchedTasks || []).forEach((t: any) => {
      if (t.klien_proyek && t.klien_proyek.toLowerCase().includes(q)) {
        clientMap[t.klien_proyek] = (clientMap[t.klien_proyek] || 0) + 1;
      }
    });

    const clients = Object.entries(clientMap).map(([name, taskCount]) => ({
      name,
      taskCount,
    }));

    return {
      tasks: (matchedTasks as any[]) || [],
      employees: (matchedEmployees as Profile[]) || [],
      clients,
    };
  } catch (err) {
    console.error('Error in globalSearch:', err);
    return { tasks: [], employees: [], clients: [] };
  }
}
