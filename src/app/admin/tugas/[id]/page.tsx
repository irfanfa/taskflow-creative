import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { redirect, notFound } from 'next/navigation';
import type {
  TaskWithAssignees,
  Profile,
  TaskCategory,
  TaskSubtask,
  TaskActivity,
} from '@/types/database';
import { TaskDetailClient } from './task-detail-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Detail Tugas | KMB Team Creative',
  description: 'Review tugas, status progres, dan hasil karya tim',
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    redirect('/pegawai');
  }

  const { id } = await params;
  const supabase = (await createClient()) as any;

  // 1. Ambil detail tugas beserta assignees
  const { data: taskData, error } = await supabase
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
      )
    `)
    .eq('id', id)
    .maybeSingle();

  if (error || !taskData) {
    notFound();
  }

  const rawTask = taskData as any;

  let creatorProfile: Profile | undefined = undefined;
  if (rawTask.created_by) {
    const { data: creatorData } = await supabase
      .from('profiles')
      .select('id, nama, email, role, spesialisasi, status_aktif, foto')
      .eq('id', rawTask.created_by)
      .maybeSingle();
    creatorProfile = (creatorData as unknown as Profile) || undefined;
  }

  const task: TaskWithAssignees = {
    ...rawTask,
    creator: creatorProfile,
    assignees: (rawTask.task_assignees || []).map((ta: any) => ({
      id: ta.id,
      user_id: ta.user_id,
      profile: ta.profiles,
    })),
  };

  // 2. Ambil pegawai untuk opsi edit assignees
  const { data: employeesData } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'pegawai')
    .eq('status_aktif', true)
    .is('deleted_at', null)
    .order('nama', { ascending: true });

  const employees: Profile[] = (employeesData as unknown as Profile[]) || [];

  // 3. Ambil kategori
  const { data: categoriesData } = await supabase
    .from('task_categories')
    .select('*')
    .order('nama', { ascending: true });

  const categories: TaskCategory[] = (categoriesData as unknown as TaskCategory[]) || [];

  const adminSupabase = createAdminClient() as any;

  // 4. Ambil data kolaborasi (subtasks & activities)
  const [{ data: subtasksData }, { data: activitiesData }] = await Promise.all([
    adminSupabase
      .from('task_subtasks')
      .select('*')
      .eq('task_id', id)
      .order('urutan', { ascending: true }),
    adminSupabase
      .from('task_activities')
      .select('*, user:profiles(id, nama, email, role, foto)')
      .eq('task_id', id)
      .order('created_at', { ascending: false }),
  ]);

  const subtasks: TaskSubtask[] = (subtasksData as unknown as TaskSubtask[]) || [];
  const activities: TaskActivity[] = (activitiesData as unknown as TaskActivity[]) || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <TaskDetailClient
        task={task}
        employees={employees}
        categories={categories}
        currentProfile={currentProfile}
        initialSubtasks={subtasks}
        initialActivities={activities}
      />
    </div>
  );
}
