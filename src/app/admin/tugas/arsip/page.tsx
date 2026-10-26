import React from 'react';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { redirect } from 'next/navigation';
import type { TaskWithAssignees } from '@/types/database';
import { TrashClient } from './trash-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Arsip & Sampah Tugas | KMB Team Creative',
  description: 'Kelola tugas yang dihapus secara soft-delete, pulihkan atau hapus permanen dari database.',
};

export default async function AdminTasksTrashPage() {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    redirect('/pegawai');
  }

  const adminSupabase = createAdminClient() as any;

  // Ambil semua tugas yang berada di arsip (deleted_at IS NOT NULL)
  const { data: archivedData, error } = await adminSupabase
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
          foto
        )
      )
    `)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });

  if (error) {
    console.error('Error fetching archived tasks:', error);
  }

  const archivedTasks: TaskWithAssignees[] = (archivedData || []).map((t: any) => ({
    ...t,
    assignees: (t.task_assignees || []).map((ta: any) => ({
      id: ta.id,
      user_id: ta.user_id,
      profile: ta.profiles,
    })),
  }));

  return (
    <div className="space-y-6">
      <TrashClient initialTasks={archivedTasks} />
    </div>
  );
}
