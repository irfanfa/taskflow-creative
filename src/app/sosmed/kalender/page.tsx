import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { redirect } from 'next/navigation';
import type { TaskWithAssignees } from '@/types/database';
import { getPegawaiMaxDeadlineDate, filterPegawaiUpcomingTasks } from '@/lib/tasks/pegawai-filter';
import { TaskCalendar } from '@/components/tasks/task-calendar';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Kalender Saya | KMB Team Creative (Pengelola Sosmed)',
  description: 'Kalender batas waktu tugas pengelola media sosial dalam zona WIB',
};

export default async function SosmedKalenderPage() {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'sosmed') {
    redirect('/login?redirect=/sosmed/kalender');
  }

  const supabase = await createClient();

  // Batas maksimal deadline 30 hari ke depan
  const maxDeadline = getPegawaiMaxDeadlineDate();

  const { data: assignedTasksData, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_assignees!inner (
        id,
        user_id,
        profiles (
          id,
          nama,
          email,
          role,
          spesialisasi,
          foto
        )
      )
    `)
    .is('deleted_at', null)
    .lte('deadline', maxDeadline.toISOString())
    .order('deadline', { ascending: true });

  if (error) {
    console.error('Error fetching sosmed calendar tasks:', error);
  }

  const rawTasks: TaskWithAssignees[] = (assignedTasksData || []).map((t: any) => ({
    ...t,
    assignees: (t.task_assignees || []).map((ta: any) => ({
      id: ta.id,
      user_id: ta.user_id,
      profile: ta.profiles,
    })),
  }));

  const tasks = filterPegawaiUpcomingTasks(rawTasks);

  return (
    <div className="space-y-6">
      <TaskCalendar
        tasks={tasks}
        role="sosmed"
        title="Kalender Saya"
        description="Jadwal batas waktu seluruh pekerjaan yang ditugaskan kepada Anda (WIB)."
      />
    </div>
  );
}
