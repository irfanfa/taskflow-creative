import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { redirect } from 'next/navigation';
import type { Notification } from '@/types/database';
import { NotificationCenterClient } from '@/components/notifications/notification-center-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pusat Notifikasi | PEP Siaran',
  description: 'Pusat notifikasi dan pengingat batas waktu PEP Siaran',
};

export default async function PepNotifikasiPage() {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'pep') {
    redirect('/login?redirect=/pep/notifikasi');
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
