-- ==============================================================================
-- MIGRATION: PERBARUI ROLE & USER SESUAI STRUKTUR 3 USER
-- 1. Ketua Tim (Admin)
-- 2. PEP (Siaran)
-- 3. Pegawai (KMB)
-- ==============================================================================

-- 1. Perbarui check constraint pada profiles.role agar mengizinkan 'pep'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'pep', 'pegawai'));

-- 2. Fungsi pembantu RLS: Cek apakah user saat ini adalah PEP
CREATE OR REPLACE FUNCTION public.is_pep()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'pep' AND status_aktif = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Update RLS Policy pada tasks:
-- PEP hanya dapat membaca tugas yang dibuatnya sendiri
-- Ketua Tim (Admin) dapat membaca seluruh tugas (termasuk dari PEP)
-- Pegawai membaca tugas yang ditugaskan kepadanya
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
CREATE POLICY "tasks_select_policy" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    -- Admin (Ketua Tim) melihat semua tugas yang belum dihapus
    (public.is_admin() AND deleted_at IS NULL)
    OR
    -- PEP hanya melihat tugas yang dibuatnya sendiri
    (public.is_pep() AND created_by = auth.uid() AND deleted_at IS NULL)
    OR
    -- Pegawai melihat tugas di mana ia terdaftar sebagai assignee
    (EXISTS (
      SELECT 1 FROM public.task_assignees
      WHERE task_assignees.task_id = tasks.id AND task_assignees.user_id = auth.uid()
    ) AND deleted_at IS NULL)
  );

-- Policy untuk PEP membuat tugas
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
CREATE POLICY "tasks_insert_policy" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin() OR public.is_pep()
  );

-- Policy untuk PEP mengupdate tugas miliknya (misal review status Setujui/Minta Revisi)
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
CREATE POLICY "tasks_update_policy" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR (public.is_pep() AND created_by = auth.uid())
    OR (EXISTS (
      SELECT 1 FROM public.task_assignees
      WHERE task_assignees.task_id = tasks.id AND task_assignees.user_id = auth.uid()
    ))
  );
