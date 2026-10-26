-- ==============================================================================
-- TAHAP 1: SKEMA DATABASE & ROW LEVEL SECURITY (RLS) TASKFLOW CREATIVE
-- Tabel: public.profiles
-- ==============================================================================

-- 1. Aktifkan ekstensi pgcrypto jika belum ada
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Buat tabel public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nama TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'pegawai' CHECK (role IN ('admin', 'pegawai')),
  spesialisasi TEXT CHECK (spesialisasi IN ('Video Editor', 'Desainer Grafis') OR spesialisasi IS NULL),
  status_aktif BOOLEAN NOT NULL DEFAULT true,
  foto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexing untuk query performa
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_spesialisasi ON public.profiles(spesialisasi);
CREATE INDEX IF NOT EXISTS idx_profiles_status_aktif ON public.profiles(status_aktif);

-- 3. Trigger untuk update updated_at otomatis
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Fungsi pembantu RLS: Cek apakah user saat ini adalah admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND status_aktif = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Trigger otomatis saat user baru mendaftar di auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nama, email, role, spesialisasi, status_aktif, foto)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nama', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'pegawai'),
    NEW.raw_user_meta_data->>'spesialisasi',
    COALESCE((NEW.raw_user_meta_data->>'status_aktif')::boolean, true),
    NEW.raw_user_meta_data->>'foto'
  )
  ON CONFLICT (id) DO UPDATE SET
    nama = COALESCE(EXCLUDED.nama, public.profiles.nama),
    email = EXCLUDED.email,
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    spesialisasi = COALESCE(EXCLUDED.spesialisasi, public.profiles.spesialisasi),
    status_aktif = COALESCE(EXCLUDED.status_aktif, public.profiles.status_aktif),
    foto = COALESCE(EXCLUDED.foto, public.profiles.foto),
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy SELECT:
-- - Admin dapat melihat semua profil (aktif maupun non-aktif)
-- - User dapat melihat profil dirinya sendiri
-- - Pegawai yang aktif dapat melihat profil rekan kerja yang aktif
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR auth.uid() = id
    OR (status_aktif = true)
  );

-- Policy INSERT:
-- Hanya Admin atau sistem trigger yang dapat menambahkan profil
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin() OR auth.uid() = id
  );

-- Policy UPDATE:
-- - Admin dapat mengupdate profil siapapun (termasuk mengubah status & role)
-- - User pegawai hanya dapat mengupdate profil miliknya sendiri (nama, foto) tanpa mengubah role/status
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() OR auth.uid() = id
  )
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() = id
      AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
      AND status_aktif = (SELECT p.status_aktif FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

-- Policy DELETE:
-- Hanya Admin yang memiliki wewenang menghapus profil
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin());
