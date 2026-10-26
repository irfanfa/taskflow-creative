import React from 'react';
import type { Profile, TaskWithAssignees } from '@/types/database';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { createClient } from '@/lib/supabase/server';
import { AdminDashboardClient } from './admin-dashboard-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard Administrator | KMB Team Creative',
  description: 'Panel visualisasi, metrik performa, beban kerja, dan monitoring tugas kreatif tim',
};

export default async function AdminDashboardPage() {
  const currentProfile = await getCurrentProfile();
  const supabase = await createClient();

  // 1. Ambil seluruh data pegawai yang aktif
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'pegawai')
    .is('deleted_at', null)
    .order('nama', { ascending: true });

  const employees: Profile[] = (teamMembers as unknown as Profile[]) || [];

  // 2. Ambil data tasks aktif
  const { data: tasksData, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_assignees (
        id,
        user_id,
        profiles (
          id,
          nama,
          spesialisasi,
          foto
        )
      )
    `)
    .is('deleted_at', null)
    .order('deadline', { ascending: true });

  if (error) {
    console.error('Error fetching admin dashboard tasks:', error);
  }

  const tasks: TaskWithAssignees[] = (tasksData || []).map((t: any) => ({
    ...t,
    assignees: (t.task_assignees || []).map((ta: any) => ({
      id: ta.id,
      user_id: ta.user_id,
      profile: ta.profiles,
    })),
  }));

  return (
    <AdminDashboardClient
      currentProfile={currentProfile}
      tasks={tasks}
      employees={employees}
    />
  );
}
