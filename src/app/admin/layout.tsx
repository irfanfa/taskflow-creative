import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin Dashboard | KMB Team Creative',
  description: 'Panel Administrator KMB Team Creative',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  // Jika belum login, redirect ke login
  if (!profile) {
    redirect('/login?redirect=/admin');
  }

  // Jika bukan role admin, tolak akses dan arahkan ke pegawai
  if (profile.role !== 'admin') {
    redirect('/pegawai');
  }

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
