import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { redirect } from 'next/navigation';
import type { Profile } from '@/types/database';
import { EmployeeManagementClient } from './employee-management-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Manajemen Tim & Coworker | KMB Team Creative',
  description: 'Kelola tim kreatif, akun coworker siaran, spesialisasi, dan hak akses',
};

export default async function AdminPegawaiPage() {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    redirect('/pegawai');
  }

  const supabase = await createClient();

  // Ambil semua pegawai tim KMB dan akun coworker PEP (termasuk yang soft deleted untuk opsi restore)
  const { data: employeesData } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['pegawai', 'pep', 'sosmed'])
    .order('created_at', { ascending: false });

  const employees: Profile[] = (employeesData as unknown as Profile[]) || [];

  return (
    <div className="space-y-6">
      <EmployeeManagementClient initialEmployees={employees} />
    </div>
  );
}
