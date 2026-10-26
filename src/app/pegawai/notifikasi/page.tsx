import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { redirect } from 'next/navigation';
import type { Notification } from '@/types/database';
import { NotificationCenterClient } from '@/components/notifications/notification-center-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pusat Notifikasi | KMB Team Creative Pegawai',
  description: 'Pusat notifikasi dan pengingat batas waktu pegawai kreatif',
};

export default async function PegawaiNotifikasiPage() {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'pegawai') {
    redirect('/login?redirect=/pegawai/notifikasi');
  }

  const supabase = await createClient();

  const { data: notificationsData } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', currentProfile.id)
    .order('created_at', { ascending: false });

  const notifications: Notification[] = (notificationsData as Notification[]) || [];

  return (
    <NotificationCenterClient
      currentProfile={currentProfile}
      initialNotifications={notifications}
    />
  );
}
