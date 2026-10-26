-- ==============================================================================
-- MIGRATION: IZINKAN PEP MENGATUR ASSIGNEE & MELIHAT AKTIVITAS TUGAS
-- ==============================================================================

-- 1. Perbarui policy task_assignees agar PEP dapat memasukkan assignee untuk tugas buatannya
DROP POLICY IF EXISTS "task_assignees_manage_policy" ON public.task_assignees;
CREATE POLICY "task_assignees_manage_policy"
  ON public.task_assignees FOR ALL
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_pep()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignees.task_id AND t.created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR public.is_pep()
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignees.task_id AND t.created_by = auth.uid()
    )
  );

-- 2. Perbarui policy SELECT task_assignees agar pembuat tugas (PEP) dapat melihat assignee tugasnya
DROP POLICY IF EXISTS "task_assignees_select_policy" ON public.task_assignees;
CREATE POLICY "task_assignees_select_policy"
  ON public.task_assignees FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR public.is_assigned_to_task(task_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignees.task_id AND t.created_by = auth.uid()
    )
  );

-- 3. Perbarui policy SELECT task_activities agar pembuat tugas (PEP) dapat melihat aktivitas tugasnya
DROP POLICY IF EXISTS "task_activities_select_policy" ON public.task_activities;
CREATE POLICY "task_activities_select_policy"
  ON public.task_activities FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR public.is_assigned_to_task(task_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_activities.task_id AND t.created_by = auth.uid()
    )
  );

-- 4. Hubungkan tugas buatan PEP yang belum memiliki assignee ke akun Pegawai (KMB)
INSERT INTO public.task_assignees (task_id, user_id)
SELECT t.id, p.id
FROM public.tasks t
CROSS JOIN public.profiles p
WHERE p.role = 'pegawai' AND p.status_aktif = true
  AND NOT EXISTS (
    SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = t.id
  )
ON CONFLICT (task_id, user_id) DO NOTHING;
