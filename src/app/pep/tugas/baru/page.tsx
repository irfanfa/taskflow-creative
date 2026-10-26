import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { redirect } from 'next/navigation';
import type { Profile, TaskCategory } from '@/types/database';
import { PepCreateTaskClient } from './pep-create-task-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Buat Tugas Siaran | Portal PEP',
  description: 'Form pendelegasian tugas dari PEP ke Pegawai (KMB)',
};

export default async function PepNewTaskPage() {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'pep') {
    redirect('/login');
  }

  const adminSupabase = createAdminClient() as any;

  // 1. Ambil profil Pegawai (KMB) aktif
  const { data: employeesData } = await adminSupabase
    .from('profiles')
    .select('*')
    .eq('role', 'pegawai')
    .eq('status_aktif', true)
    .is('deleted_at', null)
    .order('nama', { ascending: true });

  const employees: Profile[] = (employeesData as unknown as Profile[]) || [];

  // 2. Ambil daftar kategori pekerjaan
  const { data: categoriesData } = await adminSupabase
    .from('task_categories')
    .select('*')
    .order('nama', { ascending: true });

  const categories: TaskCategory[] = (categoriesData as unknown as TaskCategory[]) || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PepCreateTaskClient
        currentProfile={currentProfile}
        pegawaiAccounts={employees}
        categories={categories}
      />
    </div>
  );
}
