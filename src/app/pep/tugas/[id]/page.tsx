import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { redirect, notFound } from 'next/navigation';
import type {
  TaskWithAssignees,
  Profile,
  TaskSubtask,
  TaskActivity,
} from '@/types/database';
import { PepTaskDetailClient } from './pep-task-detail-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Detail Tugas Siaran | Portal PEP',
  description: 'Review tugas dan persetujuan hasil kerja PEP Siaran',
};

export default async function PepTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'pep') {
    redirect('/login');
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

  // ATURAN KETAT: PEP hanya dapat melihat tugas yang dibuatnya sendiri
  if (error || !taskData || taskData.deleted_at || taskData.created_by !== currentProfile.id) {
    notFound();
  }

  const rawTask = taskData as any;
  const task: TaskWithAssignees = {
    ...rawTask,
    assignees: (rawTask.task_assignees || []).map((ta: any) => ({
      id: ta.id,
      user_id: ta.user_id,
      profile: ta.profiles,
    })),
  };

  const adminSupabase = createAdminClient() as any;

  // 2. Ambil data kolaborasi: Subtasks, Activities & Categories
  const [subtasksRes, activitiesRes, categoriesRes] = await Promise.all([
    adminSupabase
      .from('task_subtasks')
      .select('*')
      .eq('task_id', id)
      .order('urutan', { ascending: true }),

    adminSupabase
      .from('task_activities')
      .select('*, user:profiles(id, nama, foto, role)')
      .eq('task_id', id)
      .order('created_at', { ascending: false }),

    adminSupabase
      .from('task_categories')
      .select('*')
      .order('nama', { ascending: true }),
  ]);

  const subtasks: TaskSubtask[] = subtasksRes.data || [];
  const activities: TaskActivity[] = activitiesRes.data || [];
  const categories = categoriesRes.data || [];

  return (
    <PepTaskDetailClient
      task={task}
      currentProfile={currentProfile}
      initialSubtasks={subtasks}
      initialActivities={activities}
      categories={categories}
    />
  );
}
