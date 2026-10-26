-- Migration: Reports and Productivity Features (Tahap 6)

ALTER TABLE public.system_notification_settings
ADD COLUMN IF NOT EXISTS max_active_tasks_per_employee INTEGER NOT NULL DEFAULT 4;

CREATE TABLE IF NOT EXISTS public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  deskripsi TEXT NULL,
  jenis_pekerjaan TEXT NOT NULL,
  spesifikasi_teknis JSONB NOT NULL DEFAULT '{}'::jsonb,
  default_subtasks TEXT[] NOT NULL DEFAULT '{}',
  prioritas_default TEXT NOT NULL DEFAULT 'Sedang',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_task_templates_jenis ON public.task_templates(jenis_pekerjaan);

CREATE TABLE IF NOT EXISTS public.recurring_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul TEXT NOT NULL,
  deskripsi TEXT NULL,
  jenis_pekerjaan TEXT NOT NULL,
  klien_proyek TEXT NOT NULL,
  prioritas TEXT NOT NULL DEFAULT 'Sedang',
  spesifikasi_teknis JSONB NOT NULL DEFAULT '{}'::jsonb,
  link_referensi TEXT NULL,
  frekuensi TEXT NOT NULL CHECK (frekuensi IN ('harian', 'mingguan', 'bulanan')),
  assignee_ids UUID[] NOT NULL DEFAULT '{}',
  default_subtasks TEXT[] NOT NULL DEFAULT '{}',
  jam_deadline TIME NOT NULL DEFAULT '17:00:00',
  hari_dalam_minggu INTEGER NULL,
  tanggal_dalam_bulan INTEGER NULL,
  tanggal_mulai DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_berakhir DATE NULL,
  terakhir_dibuat DATE NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_recurring_tasks_active ON public.recurring_tasks(is_active);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_templates_read_policy" ON public.task_templates;
CREATE POLICY "task_templates_read_policy"
  ON public.task_templates FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "task_templates_admin_write" ON public.task_templates;
CREATE POLICY "task_templates_admin_write"
  ON public.task_templates FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recurring_tasks_admin_all" ON public.recurring_tasks;
CREATE POLICY "recurring_tasks_admin_all"
  ON public.recurring_tasks FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
