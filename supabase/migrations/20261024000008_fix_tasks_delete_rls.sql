-- ==============================================================================
-- MIGRATION: PERBAIKI RLS POLICY TASKS UNTUK PENGHAPUSAN (DELETE & SOFT-DELETE)
-- Masalah sebelumnya:
-- 1. tasks_select_policy membatasi admin hanya melihat task dengan deleted_at IS NULL,
--    sehingga saat task di-update deleted_at, PostgreSQL RLS WITH CHECK/SELECT menolak update row baru.
-- 2. tasks_update_policy memperbolehkan Admin mengupdate seluruh data termasuk soft delete (deleted_at).
-- ==============================================================================

-- 1. Perbarui Kebijakan SELECT pada tasks
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
CREATE POLICY "tasks_select_policy" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    -- Admin (Ketua Tim) dapat melihat seluruh tugas (termasuk arsip/soft-deleted untuk kebutuhan log & monitoring)
    public.is_admin()
    OR
    -- PEP (Siaran) hanya melihat tugas miliknya yang belum dihapus
    (public.is_pep() AND created_by = auth.uid() AND deleted_at IS NULL)
    OR
    -- Pegawai (KMB) hanya melihat tugas aktif yang ditugaskan kepadanya
    (
      deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.task_assignees
          WHERE task_assignees.task_id = tasks.id AND task_assignees.user_id = auth.uid()
        )
      )
    )
  );

-- 2. Perbarui Kebijakan UPDATE pada tasks
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
CREATE POLICY "tasks_update_policy" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    -- Admin (Ketua Tim) memiliki wewenang update penuh (termasuk soft delete kolom deleted_at)
    public.is_admin()
    OR
    -- PEP (Siaran) dapat mengupdate tugas miliknya yang masih aktif
    (public.is_pep() AND created_by = auth.uid() AND deleted_at IS NULL)
    OR
    -- Pegawai (KMB) dapat mengupdate status pengerjaan tugas aktif miliknya
    (
      deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.task_assignees
        WHERE task_assignees.task_id = tasks.id AND task_assignees.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    -- Admin (Ketua Tim) diizinkan menyimpan perubahan apapun
    public.is_admin()
    OR
    -- PEP (Siaran)
    (public.is_pep() AND created_by = auth.uid() AND deleted_at IS NULL)
    OR
    -- Pegawai (KMB)
    (
      deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM public.task_assignees
        WHERE task_assignees.task_id = tasks.id AND task_assignees.user_id = auth.uid()
      )
    )
  );

-- 3. Kebijakan DELETE (Hard Delete jika diperlukan)
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
CREATE POLICY "tasks_delete_policy" ON public.tasks
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
  );
