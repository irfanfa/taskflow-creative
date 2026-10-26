import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { createClient } from '@/lib/supabase/server';
import { getGlobalActivities } from '@/app/actions/productivity';
import type { Profile } from '@/types/database';
import { ActivityLogClient } from './activity-log-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Log Aktivitas Global | KMB Team Creative',
  description: 'Linimasa audit trail lengkap seluruh aktivitas sistem dan tim',
};

export default async function AdminActivityLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    userId?: string;
    actionType?: string;
    startDate?: string;
    endDate?: string;
    query?: string;
  }>;
}) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    redirect('/pegawai');
  }

  const { userId, actionType, startDate, endDate, query } = await searchParams;
  const supabase = (await createClient()) as any;

  // Ambil daftar pegawai untuk filter
  const { data: employeesData } = await supabase
    .from('profiles')
    .select('*')
    .eq('status_aktif', true)
    .is('deleted_at', null)
    .order('nama', { ascending: true });

  const employees: Profile[] = (employeesData as Profile[]) || [];

  // Ambil data log aktivitas awal
  const initialActivities = await getGlobalActivities({
    userId,
    actionType,
    startDate,
    endDate,
    query,
  });

  return (
    <div className="space-y-6">
      <ActivityLogClient
        initialActivities={initialActivities}
        employees={employees}
        initialUserId={userId}
        initialActionType={actionType}
        initialStartDate={startDate}
        initialEndDate={endDate}
        initialQuery={query}
      />
    </div>
  );
}
