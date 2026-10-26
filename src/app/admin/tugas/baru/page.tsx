import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { redirect } from 'next/navigation';
import type { Profile, TaskCategory, TaskTemplate } from '@/types/database';
import { getTaskTemplates, getEmployeeWorkloads } from '@/app/actions/productivity';
import { TaskFormClient } from './task-form-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Buat Tugas Baru | KMB Team Creative',
  description: 'Form pembuatan tugas tim kreatif dan penugasan staf',
};

export default async function NewTaskPage() {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    redirect('/pegawai');
  }

  const supabase = await createClient();

  // 1. Ambil daftar pegawai aktif untuk opsi penugasan
  const { data: employeesData } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'pegawai')
    .eq('status_aktif', true)
    .is('deleted_at', null)
    .order('nama', { ascending: true });

  const employees: Profile[] = (employeesData as unknown as Profile[]) || [];

  // 2. Ambil daftar kategori pekerjaan
  const { data: categoriesData } = await supabase
    .from('task_categories')
    .select('*')
    .order('nama', { ascending: true });

  const categories: TaskCategory[] = (categoriesData as unknown as TaskCategory[]) || [];

  // 3. Ambil template tugas dan beban kerja pegawai
  const [templates, workloads] = await Promise.all([
    getTaskTemplates(),
    getEmployeeWorkloads(),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <TaskFormClient
        employees={employees}
        categories={categories}
        templates={templates}
        employeeWorkloads={workloads}
      />
    </div>
  );
}
