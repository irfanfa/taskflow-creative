import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { redirect } from 'next/navigation';
import type { TaskWithAssignees, Profile, TaskCategory } from '@/types/database';
import { TaskListClient } from './task-list-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Manajemen Tugas | KMB Team Creative',
  description: 'Daftar dan kelola seluruh tugas tim kreatif',
};

export default async function AdminTasksPage() {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    redirect('/pegawai');
  }

  const supabase = await createClient();

  // 1. Ambil seluruh tugas aktif (belum soft-delete) beserta assignees
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
    .order('deadline', { ascending: true });

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError);
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

  // 2. Ambil seluruh pegawai aktif untuk filter
  const { data: employeesData } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'pegawai')
    .is('deleted_at', null)
    .order('nama', { ascending: true });

  const employees: Profile[] = (employeesData as unknown as Profile[]) || [];

  // 3. Ambil daftar kategori
  const { data: categoriesData } = await supabase
    .from('task_categories')
    .select('*')
    .order('nama', { ascending: true });

  const categories: TaskCategory[] = (categoriesData as unknown as TaskCategory[]) || [];

  // 4. Hitung jumlah tugas di arsip/sampah
  const adminSupabase = createAdminClient() as any;
  const { count: archivedCount } = await adminSupabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .not('deleted_at', 'is', null);

  return (
    <div className="space-y-6">
      <TaskListClient
        initialTasks={tasks}
        employees={employees}
        categories={categories}
        archivedCount={archivedCount || 0}
      />
    </div>
  );
}
