import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Portal PEP (Siaran) | KMB Team Creative',
  description: 'Portal Penugasan & Review Tugas Kreatif PEP Siaran',
};

export default async function PepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/login?redirect=/pep');
  }

  // Jika bukan role PEP, arahkan ke dashboard sesuai role mereka
  if (profile.role !== 'pep') {
    if (profile.role === 'admin') {
      redirect('/admin');
    } else {
      redirect('/pegawai');
    }
  }

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
