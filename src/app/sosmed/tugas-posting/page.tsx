import React from 'react';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import type { TaskWithAssignees, Profile } from '@/types/database';
import { SosmedPostingClient } from './sosmed-posting-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tugas Posting | KMB Team Creative (Pengelola Sosmed)',
  description: 'Panel antrean dan publikasi materi konten media sosial tim kreatif',
};

export default async function TugasPostingPage() {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile) {
    redirect('/login?redirect=/sosmed/tugas-posting');
  }

  if (currentProfile.role !== 'sosmed') {
    if (currentProfile.role === 'admin') {
      redirect('/admin');
    } else if (currentProfile.role === 'pep') {
      redirect('/pep');
    } else {
      redirect('/pegawai');
    }
  }

  const adminSupabase = createAdminClient() as any;

  let postingTasksData: any[] = [];
  let needsMigration = false;

  // Coba ambil tugas dengan filter kolom perlu_upload_sosmed
  const { data, error } = await adminSupabase
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
    .eq('perlu_upload_sosmed', true)
    .eq('status', 'Selesai')
    .is('deleted_at', null)
    .order('posted_at', { ascending: true, nullsFirst: true })
    .order('updated_at', { ascending: false });

  if (error) {
    // Fallback: Jika kolom 'perlu_upload_sosmed' atau 'posted_at' belum dibuat di database (migration 20261025000002 belum dijalankan)
    if (error.code === '42703' || error.message?.includes('perlu_upload_sosmed') || error.message?.includes('posted_at')) {
      needsMigration = true;
      const { data: fallbackData } = await adminSupabase
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
        .eq('status', 'Selesai')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      postingTasksData = (fallbackData || []).map((t: any) => ({
        ...t,
        perlu_upload_sosmed: true,
        status_posting: 'menunggu_posting',
      }));
    } else {
      console.warn('Perhatian saat memuat tugas sosmed:', error.message || error);
    }
  } else {
    postingTasksData = data || [];
  }

  // Ambil data profil untuk memetakan pembuat (creator) atau pemosting (poster)
  const { data: allProfiles } = await adminSupabase
    .from('profiles')
    .select('*')
    .is('deleted_at', null);

  const profilesMap = new Map<string, Profile>(
    (allProfiles || []).map((p: Profile) => [p.id, p])
  );

  const formattedTasks: TaskWithAssignees[] = (postingTasksData || []).map((t: any) => ({
    ...t,
    creator: t.created_by ? profilesMap.get(t.created_by) : undefined,
    poster: t.posted_by ? profilesMap.get(t.posted_by) : undefined,
    assignees: (t.task_assignees || []).map((ta: any) => ({
      id: ta.id,
      user_id: ta.user_id,
      profile: ta.profiles,
    })),
  }));

  return (
    <SosmedPostingClient
      initialTasks={formattedTasks}
      currentProfile={currentProfile}
      needsMigration={needsMigration}
    />
  );
}
