import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { redirect } from 'next/navigation';
import type { TaskWithAssignees } from '@/types/database';
import { TaskCalendar } from '@/components/tasks/task-calendar';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Kalender Tim Kreatif | KMB Team Creative',
  description: 'Kalender jadwal dan batas waktu seluruh tim kreatif dalam zona WIB',
};

export default async function AdminKalenderPage() {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    redirect('/login?redirect=/admin/kalender');
  }

  const supabase = await createClient();

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
    console.error('Error fetching calendar tasks:', error);
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
    <div className="space-y-6">
      <TaskCalendar
        tasks={tasks}
        role="admin"
        title="Kalender Tim Kreatif (Seluruh Anggota)"
        description="Visualisasi tenggat waktu semua proyek video editing dan desain grafis zona waktu Asia/Jakarta (WIB)."
      />
    </div>
  );
}
