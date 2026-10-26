import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { redirect } from 'next/navigation';
import type { UserNotificationPreferences } from '@/types/database';
import { PegawaiProfileClient } from '@/app/pegawai/profil/pegawai-profile-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Profil Saya (Coworker) | PEP Siaran',
  description: 'Informasi profil dan pengaturan akun Coworker (rekan kerja siaran) mitra KMB Team',
};

export default async function PepProfilePage() {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'pep') {
    redirect('/login?redirect=/pep/profil');
  }

  const supabase = await createClient();

  const { data: prefData } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', currentProfile.id)
    .maybeSingle();

  const preferences: UserNotificationPreferences = prefData || {
    user_id: currentProfile.id,
    in_app_enabled: true,
    email_enabled: true,
    updated_at: new Date().toISOString(),
  };

  return (
    <PegawaiProfileClient
      profile={currentProfile}
      initialPreferences={preferences}
    />
  );
}
