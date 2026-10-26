-- ==============================================================================
-- TAHAP 4: SKEMA DATABASE NOTIFIKASI & LOG PENGINGAT DEADLINE
-- ==============================================================================

-- 1. Tabel notifications (Notifikasi in-app untuk pengguna)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipe TEXT NOT NULL,
  judul TEXT NOT NULL,
  pesan TEXT NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_task_id ON public.notifications(task_id);

-- 2. Tabel notification_logs (Catatan pengiriman untuk mencegah duplikasi pengingat)
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_task_user_stage_channel UNIQUE (task_id, user_id, stage, channel)
);

CREATE INDEX IF NOT EXISTS idx_notif_logs_lookup ON public.notification_logs(task_id, user_id, stage, channel);

-- 3. Tabel system_notification_settings (Pengaturan jadwal pengingat oleh Admin)
CREATE TABLE IF NOT EXISTS public.system_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_h3_enabled BOOLEAN NOT NULL DEFAULT true,
  stage_h1_enabled BOOLEAN NOT NULL DEFAULT true,
  stage_3h_enabled BOOLEAN NOT NULL DEFAULT true,
  stage_overdue_enabled BOOLEAN NOT NULL DEFAULT true,
  cc_admin_urgent BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Masukkan pengaturan awal jika belum ada
INSERT INTO public.system_notification_settings (
  id, stage_h3_enabled, stage_h1_enabled, stage_3h_enabled, stage_overdue_enabled, cc_admin_urgent
)
VALUES (
  '00000000-0000-0000-0000-000000000001', true, true, true, true, true
)
ON CONFLICT (id) DO NOTHING;

-- 4. Tabel user_notification_preferences (Preferensi channel per user)
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Isi preferensi default untuk semua user di profiles
INSERT INTO public.user_notification_preferences (user_id, in_app_enabled, email_enabled)
SELECT id, true, true FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- 5. Aktifkan Supabase Realtime untuk tabel notifications
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION
    WHEN duplicate_object THEN
      NULL; -- tabel sudah ada di publication
  END;
END $$;

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- A. RLS public.notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User dapat melihat notifikasinya sendiri" ON public.notifications;
CREATE POLICY "User dapat melihat notifikasinya sendiri"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

DROP POLICY IF EXISTS "User dapat mengupdate status baca notifikasi miliknya" ON public.notifications;
CREATE POLICY "User dapat mengupdate status baca notifikasi miliknya"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid() OR public.is_admin()
  );

DROP POLICY IF EXISTS "User dapat menghapus notifikasi miliknya" ON public.notifications;
CREATE POLICY "User dapat menghapus notifikasi miliknya"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

DROP POLICY IF EXISTS "Sistem dan admin dapat menambahkan notifikasi" ON public.notifications;
CREATE POLICY "Sistem dan admin dapat menambahkan notifikasi"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    true
  );

-- B. RLS public.notification_logs
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hanya admin atau user terkait yang dapat melihat logs" ON public.notification_logs;
CREATE POLICY "Hanya admin atau user terkait yang dapat melihat logs"
  ON public.notification_logs FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Sistem dapat mencatat notification_logs" ON public.notification_logs;
CREATE POLICY "Sistem dapat mencatat notification_logs"
  ON public.notification_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- C. RLS public.system_notification_settings
ALTER TABLE public.system_notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Semua authenticated user dapat membaca pengaturan sistem" ON public.system_notification_settings;
CREATE POLICY "Semua authenticated user dapat membaca pengaturan sistem"
  ON public.system_notification_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Hanya admin yang dapat mengubah pengaturan sistem" ON public.system_notification_settings;
CREATE POLICY "Hanya admin yang dapat mengubah pengaturan sistem"
  ON public.system_notification_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- D. RLS public.user_notification_preferences
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User dapat membaca dan mengupdate preferensinya sendiri" ON public.user_notification_preferences;
CREATE POLICY "User dapat membaca dan mengupdate preferensinya sendiri"
  ON public.user_notification_preferences FOR ALL
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid() OR public.is_admin()
  );
