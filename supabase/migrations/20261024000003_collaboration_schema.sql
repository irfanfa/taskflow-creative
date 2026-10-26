-- ==============================================================================
-- TAHAP 5: SKEMA DATABASE ALUR KERJA KOLABORASI
-- Review, Komentar @mention, Lampiran Storage, Subtask, Time Tracking, Activity Log
-- ==============================================================================

-- 1. Tambah kolom revisi pada public.tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS revision_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS catatan_revisi TEXT NULL;

-- 2. Tabel task_comments (Diskusi & @mention)
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pesan TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.task_comments(created_at ASC);

-- 3. Tabel task_attachments (Lampiran file brief & hasil di Supabase Storage)
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  kategori TEXT NOT NULL DEFAULT 'umum' CHECK (kategori IN ('brief', 'hasil', 'umum')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_attachments_task_id ON public.task_attachments(task_id);

-- 4. Tabel task_subtasks (Checklist tahapan pengerjaan tugas)
CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  urutan INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON public.task_subtasks(task_id);

-- 5. Tabel task_time_logs (Pelacakan waktu pengerjaan / timer)
CREATE TABLE IF NOT EXISTS public.task_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ended_at TIMESTAMPTZ NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  is_running BOOLEAN NOT NULL DEFAULT false,
  catatan TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_time_logs_task_id ON public.task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_running ON public.task_time_logs(user_id, is_running);

-- 6. Tabel task_activities (Riwayat linimasa log aktivitas tugas)
CREATE TABLE IF NOT EXISTS public.task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  old_value TEXT NULL,
  new_value TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_activities_task_id ON public.task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON public.task_activities(created_at DESC);

-- 7. Supabase Storage Bucket untuk lampiran tugas
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Kebijakan Storage Bucket task-attachments
DROP POLICY IF EXISTS "Public view for task attachments" ON storage.objects;
CREATE POLICY "Public view for task attachments"
  ON storage.objects FOR SELECT
  TO authenticated, anon
  USING (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "Authenticated users can upload task attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload task attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-attachments');

DROP POLICY IF EXISTS "Users can delete own task attachments" ON storage.objects;
CREATE POLICY "Users can delete own task attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'task-attachments');

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- A. RLS public.task_comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_comments_select_policy" ON public.task_comments;
CREATE POLICY "task_comments_select_policy"
  ON public.task_comments FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR public.is_assigned_to_task(task_id, auth.uid())
  );

DROP POLICY IF EXISTS "task_comments_insert_policy" ON public.task_comments;
CREATE POLICY "task_comments_insert_policy"
  ON public.task_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() OR public.is_assigned_to_task(task_id, auth.uid())
  );

DROP POLICY IF EXISTS "task_comments_delete_policy" ON public.task_comments;
CREATE POLICY "task_comments_delete_policy"
  ON public.task_comments FOR DELETE
  TO authenticated
  USING (
    public.is_admin() OR user_id = auth.uid()
  );

-- B. RLS public.task_attachments
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_attachments_select_policy" ON public.task_attachments;
CREATE POLICY "task_attachments_select_policy"
  ON public.task_attachments FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR public.is_assigned_to_task(task_id, auth.uid())
  );

DROP POLICY IF EXISTS "task_attachments_insert_policy" ON public.task_attachments;
CREATE POLICY "task_attachments_insert_policy"
  ON public.task_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() OR public.is_assigned_to_task(task_id, auth.uid())
  );

DROP POLICY IF EXISTS "task_attachments_delete_policy" ON public.task_attachments;
CREATE POLICY "task_attachments_delete_policy"
  ON public.task_attachments FOR DELETE
  TO authenticated
  USING (
    public.is_admin() OR uploader_id = auth.uid()
  );

-- C. RLS public.task_subtasks
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_subtasks_select_policy" ON public.task_subtasks;
CREATE POLICY "task_subtasks_select_policy"
  ON public.task_subtasks FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR public.is_assigned_to_task(task_id, auth.uid())
  );

DROP POLICY IF EXISTS "task_subtasks_all_policy" ON public.task_subtasks;
CREATE POLICY "task_subtasks_all_policy"
  ON public.task_subtasks FOR ALL
  TO authenticated
  USING (
    public.is_admin() OR public.is_assigned_to_task(task_id, auth.uid())
  )
  WITH CHECK (
    public.is_admin() OR public.is_assigned_to_task(task_id, auth.uid())
  );

-- D. RLS public.task_time_logs
ALTER TABLE public.task_time_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_time_logs_select_policy" ON public.task_time_logs;
CREATE POLICY "task_time_logs_select_policy"
  ON public.task_time_logs FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR user_id = auth.uid() OR public.is_assigned_to_task(task_id, auth.uid())
  );

DROP POLICY IF EXISTS "task_time_logs_insert_policy" ON public.task_time_logs;
CREATE POLICY "task_time_logs_insert_policy"
  ON public.task_time_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "task_time_logs_update_policy" ON public.task_time_logs;
CREATE POLICY "task_time_logs_update_policy"
  ON public.task_time_logs FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() OR user_id = auth.uid()
  )
  WITH CHECK (
    public.is_admin() OR user_id = auth.uid()
  );

-- E. RLS public.task_activities
ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_activities_select_policy" ON public.task_activities;
CREATE POLICY "task_activities_select_policy"
  ON public.task_activities FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR public.is_assigned_to_task(task_id, auth.uid())
  );

DROP POLICY IF EXISTS "task_activities_insert_policy" ON public.task_activities;
CREATE POLICY "task_activities_insert_policy"
  ON public.task_activities FOR INSERT
  TO authenticated
  WITH CHECK (true);
