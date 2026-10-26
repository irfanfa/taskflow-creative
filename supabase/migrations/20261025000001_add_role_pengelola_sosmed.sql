-- ==============================================================================
-- MIGRATION: TAMBAH ROLE PENGELOLA SOSMED & USER SOSMED
-- 1. Perbarui check constraint pada profiles.role agar mengizinkan 'sosmed'
-- 2. Tambah user Pengelola Sosmed:
--    Username: sosmed@kmbteam.com (shortcut: sosmed)
--    Password: Password123!
-- ==============================================================================

-- 1. Perbarui check constraint pada profiles.role agar mengizinkan 'sosmed'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'pep', 'pegawai', 'sosmed'));

-- 2. Fungsi pembantu RLS: Cek apakah user saat ini adalah Pengelola Sosmed
CREATE OR REPLACE FUNCTION public.is_sosmed()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'sosmed' AND status_aktif = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Update RLS Policy pada tasks:
-- - Admin (Ketua Tim) melihat seluruh tugas
-- - PEP melihat tugas yang dibuatnya
-- - Pegawai & Pengelola Sosmed melihat tugas di mana ia terdaftar sebagai assignee
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
  );

-- 4. Seed user sosmed@kmbteam.com
DO $$
DECLARE
  v_encrypted_pw TEXT;
  v_sosmed_id UUID := 'd0000000-0000-0000-0000-000000000099';
BEGIN
  v_encrypted_pw := crypt('Password123!', gen_salt('bf'));

  -- Masukkan ke auth.users jika belum ada
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sosmed@kmbteam.com') THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      phone, phone_change, phone_change_token, email_change_token_current, reauthentication_token, is_sso_user
    ) VALUES (
      v_sosmed_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'sosmed@kmbteam.com', v_encrypted_pw, now(),
      '{"provider":"email","providers":["email"]}',
      '{"nama":"Pengelola Sosmed","role":"sosmed"}',
      now(), now(), '', '', '', '', null, '', '', '', '', false
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      v_sosmed_id, v_sosmed_id,
      jsonb_build_object('sub', v_sosmed_id::text, 'email', 'sosmed@kmbteam.com'),
      'email', v_sosmed_id::text, now(), now(), now()
    );
  ELSE
    -- Jika sudah ada di auth.users, pastikan password & metadata tersinkron
    UPDATE auth.users
    SET encrypted_password = v_encrypted_pw,
        raw_user_meta_data = '{"nama":"Pengelola Sosmed","role":"sosmed"}'::jsonb,
        updated_at = now()
    WHERE email = 'sosmed@kmbteam.com';
  END IF;

  -- Upsert record ke public.profiles
  INSERT INTO public.profiles (id, nama, email, role, spesialisasi, status_aktif, foto)
  VALUES (
    v_sosmed_id, 'Pengelola Sosmed', 'sosmed@kmbteam.com', 'sosmed', NULL, true,
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  )
  ON CONFLICT (id) DO UPDATE SET 
    nama = 'Pengelola Sosmed', 
    email = 'sosmed@kmbteam.com', 
    role = 'sosmed', 
    status_aktif = true;

  -- Preferensi Notifikasi Default
  INSERT INTO public.user_notification_preferences (user_id, in_app_enabled, email_enabled, updated_at)
  VALUES (v_sosmed_id, true, true, now())
  ON CONFLICT (user_id) DO NOTHING;

END $$;
