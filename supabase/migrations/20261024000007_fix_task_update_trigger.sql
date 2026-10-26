-- ==============================================================================
-- MIGRATION: PERBAIKI TRIGGER UPDATE TUGAS UNTUK ADMIN, PEP & SERVICE ROLE
-- Masalah sebelumnya: Trigger check_task_update_permissions() menolak edit dari
-- PEP & Service Role karena menganggap siapapun selain admin adalah pegawai.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_task_update_permissions()
RETURNS TRIGGER AS $$
DECLARE
  current_user_role TEXT;
  jwt_role TEXT;
BEGIN
  -- 1. Jika request berasal dari service_role (service role key pada backend server actions)
  --    atau auth.uid() IS NULL, bypass pemeriksaan trigger karena wewenang sudah divalidasi
  --    secara ketat pada Server Actions TypeScript.
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
    -- PEP hanya berwenang mengubah tugas miliknya sendiri
    IF OLD.created_by != auth.uid() THEN
      RAISE EXCEPTION 'Akses ditolak: Anda hanya dapat memperbarui tugas yang Anda buat sendiri.';
    END IF;

    -- Jika tugas sudah dikerjakan (bukan 'Belum Dimulai'), larang edit kolom vital
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
    -- Pegawai tidak boleh langsung menyelesaikan tugas (harus melalui approval Admin / PEP)
    IF NEW.status = 'Selesai' AND OLD.status != 'Selesai' THEN
      RAISE EXCEPTION 'Hanya Administrator atau PEP pembuat tugas yang berwenang menyetujui penyelesaian tugas.';
    END IF;

    -- Pegawai dilarang memodifikasi kolom vital (judul, deadline, deleted_at, prioritas)
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

-- Pastikan trigger terpasang ulang
DROP TRIGGER IF EXISTS enforce_task_update_rules ON public.tasks;
CREATE TRIGGER enforce_task_update_rules
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_task_update_permissions();
