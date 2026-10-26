import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { redirect } from 'next/navigation';
import type { TaskWithAssignees, Profile } from '@/types/database';
import { getPegawaiMaxDeadlineDate, filterPegawaiUpcomingTasks } from '@/lib/tasks/pegawai-filter';
import { PegawaiDashboardClient } from '@/app/pegawai/pegawai-dashboard-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tugas Saya | KMB Team Creative (Pengelola Sosmed)',
  description: 'Panel kerja dan antrean tugas pengelola media sosial',
};

export default async function SosmedDashboardPage() {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile) {
    redirect('/login?redirect=/sosmed');
  }

  // Jika bukan role sosmed, alihkan ke panel yang sesuai
  if (currentProfile.role !== 'sosmed') {
    if (currentProfile.role === 'admin') {
      redirect('/admin');
    } else if (currentProfile.role === 'pep') {
      redirect('/pep');
    } else {
      redirect('/pegawai');
    }
  }

  const supabase = await createClient();

  // Batas maksimal deadline 30 hari ke depan
  const maxDeadline = getPegawaiMaxDeadlineDate();

  // 1. Ambil tugas yang ditugaskan kepada akun sosmed yang sedang login dengan deadline <= 30 hari ke depan
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
      ),
      task_subtasks (
        id,
        is_completed
      )
    `)
    .is('deleted_at', null)
    .lte('deadline', maxDeadline.toISOString())
    .order('deadline', { ascending: true });

  if (error) {
    console.error('Error fetching sosmed tasks:', error);
  }

  // 2. Ambil profil semua user aktif untuk memetakan creator
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('*')
    .eq('status_aktif', true)
    .is('deleted_at', null)
    .order('nama', { ascending: true });

  const activeMembers: Profile[] = (teamMembers as unknown as Profile[]) || [];

  const rawTasks: TaskWithAssignees[] = (assignedTasksData || []).map((t: any) => {
    const subtasks = t.task_subtasks || [];
    const subtasks_total = subtasks.length;
    const subtasks_completed = subtasks.filter((s: any) => s.is_completed).length;
    const creator = activeMembers.find((m) => m.id === t.created_by);
    return {
      ...t,
      creator,
      assignees: (t.task_assignees || []).map((ta: any) => ({
        id: ta.id,
        user_id: ta.user_id,
        profile: ta.profiles,
      })),
      subtasks_total,
      subtasks_completed,
    };
  });

  // Pastikan tugas dengan batas waktu > 30 hari tidak tampil dulu
  const tasks = filterPegawaiUpcomingTasks(rawTasks);

  return (
    <div className="space-y-6">
      <PegawaiDashboardClient
        currentProfile={currentProfile}
        initialTasks={tasks}
        activeMembers={activeMembers}
      />
    </div>
  );
}
