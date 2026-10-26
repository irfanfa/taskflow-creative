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
import { PegawaiTaskDetailClient } from './pegawai-task-detail-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Detail Tugas Pegawai | KMB Team Creative',
  description: 'Instruksi pengerjaan dan penyerahan karya tugas kreatif',
};

export default async function PegawaiTaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile) {
    redirect('/login?redirect=/pegawai');
  }

  if (currentProfile.role !== 'pegawai' && currentProfile.role !== 'sosmed') {
    redirect('/admin');
  }

  const { id } = await params;
  const adminSupabase = createAdminClient() as any;

  // 1. Ambil tugas beserta seluruh assignees menggunakan adminSupabase
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
    // Tugas tidak ditemukan atau sudah dihapus
    notFound();
  }

  // Jika role pegawai biasa (bukan sosmed), pastikan pegawai ini adalah salah satu assignee
  if (currentProfile.role === 'pegawai') {
    const isAssigned = (taskData.task_assignees || []).some(
      (ta: any) => ta.user_id === currentProfile.id
    );
    if (!isAssigned) {
      notFound();
    }
  }

  // Jika role pengelola sosmed dan tugas sudah berstatus 'Selesai', otomatis pastikan tercatat sebagai pelaksana/PJ
  if (currentProfile.role === 'sosmed' && taskData.status === 'Selesai') {
    const { ensureSosmedAssignee } = await import('@/lib/tasks/assign-sosmed');
    await ensureSosmedAssignee(id, adminSupabase);
  }

  const rawTask = taskData as any;

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
    <div className="max-w-4xl mx-auto space-y-6">
      <PegawaiTaskDetailClient
        task={task}
        currentProfile={currentProfile}
        initialSubtasks={subtasks}
        initialActivities={activities}
      />
    </div>
  );
}
