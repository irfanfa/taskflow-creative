-- ==============================================================================
-- TAHAP 2: SKEMA DATABASE TASKS, TASK_ASSIGNEES, DAN TASK_CATEGORIES
-- ==============================================================================

-- 1. Tambahkan kolom deleted_at pada public.profiles untuk soft delete pegawai
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- 2. Buat tabel task_categories (Kategori pekerjaan yang dapat ditambah admin)
CREATE TABLE IF NOT EXISTS public.task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL UNIQUE,
  tipe TEXT NOT NULL DEFAULT 'Umum',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Masukkan kategori dasar jika belum ada
INSERT INTO public.task_categories (nama, tipe)
VALUES 
  ('Video Editing', 'Video'),
  ('Desain E-Flyer', 'Desain'),
  ('Motion Graphics', 'Video'),
  ('Banner Digital', 'Desain')
ON CONFLICT (nama) DO NOTHING;

-- 3. Buat tabel tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul TEXT NOT NULL,
  deskripsi TEXT,
  jenis_pekerjaan TEXT NOT NULL,
  klien_proyek TEXT NOT NULL,
  prioritas TEXT NOT NULL CHECK (prioritas IN ('Rendah', 'Sedang', 'Tinggi', 'Urgent')),
  tanggal_mulai TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  deadline TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'Belum Dimulai' CHECK (status IN ('Belum Dimulai', 'Sedang Dikerjakan', 'Menunggu Review', 'Revisi', 'Selesai')),
  spesifikasi_teknis JSONB NOT NULL DEFAULT '{}'::jsonb,
  link_referensi TEXT,
  link_hasil TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexing untuk query tasks performa tinggi
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON public.tasks(deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_prioritas ON public.tasks(prioritas);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON public.tasks(deleted_at);

-- Trigger updated_at pada tabel tasks
DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Buat tabel task_assignees (Relasi many-to-many: satu tugas bisa banyak pegawai)
CREATE TABLE IF NOT EXISTS public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT task_user_unique UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON public.task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON public.task_assignees(user_id);

-- 5. Trigger keamanan: Pegawai tidak boleh mengubah status ke 'Selesai' atau memodifikasi kolom vital
CREATE OR REPLACE FUNCTION public.check_task_update_permissions()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role TEXT;
  jwt_role TEXT;
BEGIN
  -- 1. Jika request berasal dari service_role / backend script (auth.uid() IS NULL), izinkan
  BEGIN
    jwt_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN
    jwt_role := NULL;
  END;

  IF jwt_role = 'service_role' OR auth.role() = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- 2. Ambil role user aktif dari profiles
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid() AND status_aktif = true;

  -- 3. Jika Admin (Ketua Tim): Memiliki wewenang penuh
  IF current_user_role = 'admin' THEN
    RETURN NEW;
  END IF;

  -- 4. Jika PEP (Siaran):
  IF current_user_role = 'pep' THEN
    IF OLD.created_by != auth.uid() THEN
      RAISE EXCEPTION 'Akses ditolak: Anda hanya dapat memperbarui tugas yang Anda buat sendiri.';
    END IF;

    IF OLD.status != 'Belum Dimulai' AND (
      NEW.judul != OLD.judul OR
      NEW.deadline != OLD.deadline OR
      NEW.prioritas != OLD.prioritas OR
      (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL)
    ) THEN
      RAISE EXCEPTION 'Tugas yang sudah mulai dikerjakan tidak dapat diubah rinciannya.';
    END IF;

    RETURN NEW;
  END IF;

  -- 5. Jika Pegawai (KMB) atau role lainnya:
  IF current_user_role = 'pegawai' OR current_user_role IS NULL THEN
    IF NEW.status = 'Selesai' AND OLD.status != 'Selesai' THEN
      RAISE EXCEPTION 'Hanya Administrator atau PEP pembuat tugas yang berwenang menyetujui penyelesaian tugas.';
    END IF;

    IF NEW.judul != OLD.judul OR
       NEW.deadline != OLD.deadline OR
       NEW.prioritas != OLD.prioritas OR
       (NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL) THEN
      RAISE EXCEPTION 'Pegawai hanya diizinkan memperbarui status pengerjaan dan link hasil kerja.';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_task_update_rules ON public.tasks;
CREATE TRIGGER enforce_task_update_rules
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_task_update_permissions();

-- 6. FUNGSI PEMBANTU RLS (SECURITY DEFINER untuk memutus recursion loop)
CREATE OR REPLACE FUNCTION public.is_assigned_to_task(_task_id UUID, _user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF _task_id IS NULL OR _user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE task_id = _task_id AND user_id = _user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

GRANT EXECUTE ON FUNCTION public.is_assigned_to_task(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_assigned_to_task(UUID, UUID) TO service_role;

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- A. RLS UNTUK task_categories
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Semua user authenticated dapat melihat kategori" ON public.task_categories;
CREATE POLICY "Semua user authenticated dapat melihat kategori"
  ON public.task_categories FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Hanya admin yang dapat mengelola kategori" ON public.task_categories;
CREATE POLICY "Hanya admin yang dapat mengelola kategori"
  ON public.task_categories FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- B. RLS UNTUK tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- SELECT:
-- - Admin dapat melihat semua tugas (termasuk yang soft delete untuk audit)
-- - Pegawai HANYA dapat melihat tugas yang ditugaskan kepada dirinya dan belum di-soft-delete
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
CREATE POLICY "tasks_select_policy"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR (
      deleted_at IS NULL
      AND public.is_assigned_to_task(id, auth.uid())
    )
  );

-- INSERT: Hanya Admin yang dapat membuat tugas baru
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
CREATE POLICY "tasks_insert_policy"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- UPDATE:
-- - Admin dapat mengupdate seluruh data tugas
-- - Pegawai hanya dapat mengupdate tugas miliknya yang aktif
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
CREATE POLICY "tasks_update_policy"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    public.is_admin()
    OR (
      deleted_at IS NULL
      AND public.is_assigned_to_task(id, auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      deleted_at IS NULL
      AND public.is_assigned_to_task(id, auth.uid())
    )
  );

-- DELETE: Hanya Admin yang dapat hard delete (meskipun aplikasi menggunakan soft delete)
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;
CREATE POLICY "tasks_delete_policy"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- C. RLS UNTUK task_assignees
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- SELECT:
-- - Admin dapat melihat semua penugasan
-- - Pegawai dapat melihat penugasan pada tugas yang melibatkan dirinya
DROP POLICY IF EXISTS "task_assignees_select_policy" ON public.task_assignees;
CREATE POLICY "task_assignees_select_policy"
  ON public.task_assignees FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR public.is_assigned_to_task(task_id, auth.uid())
  );

-- INSERT/UPDATE/DELETE: Hanya Admin yang dapat mengatur penugasan
DROP POLICY IF EXISTS "task_assignees_manage_policy" ON public.task_assignees;
CREATE POLICY "task_assignees_manage_policy"
  ON public.task_assignees FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
