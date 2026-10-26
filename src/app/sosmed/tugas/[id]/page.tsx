import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { redirect, notFound } from 'next/navigation';
import type {
  TaskWithAssignees,
  Profile,
  TaskSubtask,
  TaskActivity,
} from '@/types/database';
import { ensureSosmedAssignee } from '@/lib/tasks/assign-sosmed';
import { SosmedTaskDetailClient } from './sosmed-task-detail-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Detail Tugas & Materi Visual | Pengelola Sosmed',
  description: 'Instruksi pengerjaan, materi visual, dan pengelolaan publikasi media sosial',
};

export default async function SosmedTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile) {
    redirect('/login?redirect=/sosmed');
  }

  // Wewenang: Pengelola Sosmed atau Admin
  if (currentProfile.role !== 'sosmed' && currentProfile.role !== 'admin') {
    if (currentProfile.role === 'pep') {
      redirect('/pep');
    } else {
      redirect('/pegawai');
    }
  }

  const { id } = await params;
  const adminSupabase = createAdminClient() as any;

  // 1. Ambil data tugas beserta seluruh assignees menggunakan adminSupabase
  const { data: taskData, error } = await adminSupabase
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
          foto
        )
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !taskData) {
    notFound();
  }

  // Jika tugas sudah 'Selesai', otomatis pastikan akun sosmed tercatat sebagai pelaksana/PJ
  if (taskData.status === 'Selesai') {
    try {
      await ensureSosmedAssignee(id, adminSupabase);
    } catch (err) {
      console.warn('Gagal menambahkan sosmed assignee:', err);
    }
  }

  const rawTask = taskData as any;

  // Ambil profil creator
  let creatorProfile: Profile | undefined = undefined;
  if (rawTask.created_by) {
    const { data: creatorData } = await adminSupabase
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

  // 2. Ambil data kolaborasi (subtasks & activities)
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
      <SosmedTaskDetailClient
        task={task}
        currentProfile={currentProfile}
        initialSubtasks={subtasks}
        initialActivities={activities}
      />
    </div>
  );
}
