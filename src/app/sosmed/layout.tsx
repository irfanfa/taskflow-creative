import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Ruang Kerja Pengelola Sosmed | KMB Team Creative',
  description: 'Panel Pengelola Media Sosial KMB Team Creative',
};

export default async function SosmedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  // Jika belum login, redirect ke login
  if (!profile) {
    redirect('/login?redirect=/sosmed');
  }

  // Jika bukan role sosmed, arahkan ke dashboard sesuai role mereka
  if (profile.role !== 'sosmed') {
    if (profile.role === 'admin') {
      redirect('/admin');
    } else if (profile.role === 'pep') {
      redirect('/pep');
    } else {
      redirect('/pegawai');
    }
  }

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
