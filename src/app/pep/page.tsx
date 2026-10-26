import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { redirect } from 'next/navigation';
import type { TaskWithAssignees } from '@/types/database';
import { PepDashboardClient } from './pep-dashboard-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard Tugas PEP | KMB Team Creative',
  description: 'Portal pemantauan tugas khusus PEP Siaran',
};

export default async function PepDashboardPage() {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'pep') {
    redirect('/login');
  }

  const supabase = await createClient();

  // Ambil hanya tugas yang dibuat oleh PEP sendiri (created_by === currentProfile.id)
  const { data: tasksData, error: tasksError } = await supabase
    .from('tasks')
    .select(`
      *,
      task_assignees (
        id,
        user_id,
        profiles (
          id,
          nama,
          email,
          role,
          spesialisasi,
          status_aktif,
          foto
        )
      ),
      task_subtasks (
        id,
        is_completed
      )
    `)
    .is('deleted_at', null)
    .eq('created_by', currentProfile.id)
    .order('created_at', { ascending: false });

  if (tasksError) {
    console.error('Error fetching PEP tasks:', tasksError);
  }

  // Transform assignees and compute subtask progress
  const tasks: TaskWithAssignees[] = (tasksData || []).map((t: any) => {
    const subtasks = t.task_subtasks || [];
    const subtasks_total = subtasks.length;
    const subtasks_completed = subtasks.filter((s: any) => s.is_completed).length;
    return {
      ...t,
      assignees: (t.task_assignees || []).map((ta: any) => ({
        id: ta.id,
        user_id: ta.user_id,
        profile: ta.profiles,
      })),
      subtasks_total,
      subtasks_completed,
    };
  });

  return (
    <PepDashboardClient
      initialTasks={tasks}
      currentProfile={currentProfile}
    />
  );
}
