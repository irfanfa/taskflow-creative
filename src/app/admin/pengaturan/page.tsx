import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { redirect } from 'next/navigation';
import type {
  SystemNotificationSettings,
  UserNotificationPreferences,
  Profile,
  TaskCategory,
  TaskTemplate,
  RecurringTask,
} from '@/types/database';
import { getTaskTemplates, getRecurringTasks } from '@/app/actions/productivity';
import { getCloudinaryUsageAction } from '@/app/actions/cloudinary';
import { AdminSettingsClient } from './admin-settings-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pengaturan Sistem, Template & Produktivitas | KMB Team Creative',
  description: 'Konfigurasi jadwal pengingat batas waktu, template tugas, dan jadwal tugas berulang',
};

export default async function AdminPengaturanPage() {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    redirect('/login?redirect=/admin/pengaturan');
  }

  const supabase = await createClient();

  // 1. Ambil pengaturan sistem notifikasi
  const { data: settingsData } = await supabase
    .from('system_notification_settings')
    .select('*')
    .single();

  const settings: SystemNotificationSettings = (settingsData as unknown as SystemNotificationSettings) || {
    id: '00000000-0000-0000-0000-000000000001',
    stage_h3_enabled: true,
    stage_h1_enabled: true,
    stage_3h_enabled: true,
    stage_overdue_enabled: true,
    cc_admin_urgent: true,
    max_active_tasks_per_employee: 4,
    updated_at: new Date().toISOString(),
  };

  // 2. Ambil preferensi notifikasi user saat ini
  const { data: prefData } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', currentProfile.id)
    .maybeSingle();

  const preferences: UserNotificationPreferences = (prefData as unknown as UserNotificationPreferences) || {
    user_id: currentProfile.id,
    in_app_enabled: true,
    email_enabled: true,
    updated_at: new Date().toISOString(),
  };

  // 3. Ambil template, recurring tasks, pegawai, kategori, dan Cloudinary usage
  const [templates, recurringTasks, { data: empData }, { data: catData }, cloudinaryRes] =
    await Promise.all([
      getTaskTemplates(),
      getRecurringTasks(),
      supabase
        .from('profiles')
        .select('*')
        .eq('role', 'pegawai')
        .eq('status_aktif', true)
        .is('deleted_at', null)
        .order('nama', { ascending: true }),
      supabase.from('task_categories').select('*').order('nama', { ascending: true }),
      getCloudinaryUsageAction(),
    ]);

  return (
    <AdminSettingsClient
      currentProfile={currentProfile}
      initialSettings={settings}
      initialPreferences={preferences}
      initialTemplates={templates}
      initialRecurringTasks={recurringTasks}
      employees={(empData as unknown as Profile[]) || []}
      categories={(catData as unknown as TaskCategory[]) || []}
      isCloudinaryActive={cloudinaryRes.isConfigured}
      initialCloudinaryUsage={cloudinaryRes.data || null}
    />
  );
}
