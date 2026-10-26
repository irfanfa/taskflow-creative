-- ==============================================================================
-- MIGRATION: DUKUNGAN ALUR TUGAS POSTING SOSMED & AUTO HARI BESAR NASIONAL
-- 1. Tambah kolom perlu_upload_sosmed, status_posting, link_posting, catatan_posting, posted_at, posted_by pada tasks
-- 2. Perbarui policy RLS agar Pengelola Sosmed dapat melihat tugas dengan status 'Selesai' dan perlu_upload_sosmed = true
-- 3. Set perlu_upload_sosmed = true untuk tugas hari besar yang sudah ada
-- ==============================================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS perlu_upload_sosmed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status_posting VARCHAR(50) DEFAULT 'menunggu_posting',
  ADD COLUMN IF NOT EXISTS link_posting TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS catatan_posting TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS posted_by UUID REFERENCES public.profiles(id) DEFAULT NULL;

-- Perbarui tasks_select_policy agar pengelola sosmed dapat melihat tugas selesai yang perlu diposting
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
CREATE POLICY "tasks_select_policy" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    (public.is_admin() AND deleted_at IS NULL)
    OR
    (public.is_pep() AND created_by = auth.uid() AND deleted_at IS NULL)
    OR
    (EXISTS (
      SELECT 1 FROM public.task_assignees
      WHERE task_assignees.task_id = tasks.id AND task_assignees.user_id = auth.uid()
    ) AND deleted_at IS NULL)
    OR
    (public.is_sosmed() AND perlu_upload_sosmed = TRUE AND status = 'Selesai' AND deleted_at IS NULL)
  );

-- Buat policy agar pengelola sosmed dapat memperbarui status_posting, link_posting, catatan_posting, posted_at, posted_by
DROP POLICY IF EXISTS "tasks_sosmed_update_posting_policy" ON public.tasks;
CREATE POLICY "tasks_sosmed_update_posting_policy" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_sosmed() AND perlu_upload_sosmed = TRUE AND status = 'Selesai' AND deleted_at IS NULL
  )
  WITH CHECK (
    public.is_sosmed() AND perlu_upload_sosmed = TRUE AND status = 'Selesai' AND deleted_at IS NULL
  );

-- Otomatis tandai seluruh tugas Desain E-Flyer / Hari Besar yang sudah ada agar perlu_upload_sosmed = true
UPDATE public.tasks
SET perlu_upload_sosmed = TRUE
WHERE (
  jenis_pekerjaan ILIKE '%E-Flyer%'
  OR judul ILIKE '%Desain E-Flyer%'
  OR judul ILIKE '%Hari Besar%'
  OR deskripsi ILIKE '%Instruksi Pengerjaan Desain E-Flyer Resmi%'
);
