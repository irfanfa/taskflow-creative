import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { DashboardShell } from '@/components/layout/dashboard-shell';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard Pegawai | KMB Team Creative',
  description: 'Panel Kerja Tim Kreatif KMB Team Creative',
};

export default async function PegawaiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  // Jika belum login, redirect ke login
  if (!profile) {
    redirect('/login?redirect=/pegawai');
  }

  // Jika bukan role pegawai, arahkan ke dashboard sesuai role mereka
  if (profile.role !== 'pegawai') {
    if (profile.role === 'sosmed') {
      redirect('/sosmed');
    } else if (profile.role === 'pep') {
      redirect('/pep');
    } else {
      redirect('/admin');
    }
  }

  return <DashboardShell profile={profile}>{children}</DashboardShell>;
}
