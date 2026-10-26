import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { createClient } from '@/lib/supabase/server';
import { getPerformanceReport } from '@/app/actions/reports';
import type { Profile } from '@/types/database';
import { ReportsClient } from './reports-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Laporan Kinerja & Produktivitas | KMB Team Creative',
  description: 'Analisis metrik penyelesaian tugas, ketepatan waktu, dan efisiensi tim kreatif',
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    status?: string;
  }>;
}) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    redirect('/pegawai');
  }

  const { startDate, endDate, employeeId, status } = await searchParams;
  const supabase = (await createClient()) as any;

  // 1. Ambil data pegawai untuk filter
  const { data: employeesData } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'pegawai')
    .is('deleted_at', null)
    .order('nama', { ascending: true });

  const employees: Profile[] = (employeesData as Profile[]) || [];

  // 2. Ambil data laporan awal
  const reportData = await getPerformanceReport({
    startDate,
    endDate,
    employeeId,
    status,
  });

  return (
    <div className="space-y-6">
      <ReportsClient
        initialReport={reportData}
        employees={employees}
        initialStartDate={startDate}
        initialEndDate={endDate}
        initialEmployeeId={employeeId}
        initialStatus={status}
      />
    </div>
  );
}
