-- ==============================================================================
-- SEED DATA 3 USER UTAMA:
-- 1. Ketua Tim (Admin): katim@kmbteam.com (shortcut: katim)
-- 2. PEP (Siaran): pep@kmbteam.com (shortcut: pep)
-- 3. Pegawai (KMB): kmb@kmbteam.com (shortcut: kmb)
-- Password semua akun: Password123!
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  v_encrypted_pw TEXT;
  v_admin_id UUID := 'a0000000-0000-0000-0000-000000000001';
  v_pep_id UUID   := 'b0000000-0000-0000-0000-000000000099';
  v_kmb_id UUID   := 'c0000000-0000-0000-0000-000000000099';
BEGIN
  v_encrypted_pw := crypt('Password123!', gen_salt('bf'));

  -- Hapus data user lama
  DELETE FROM auth.users WHERE email IN (
    'admin@taskflow.local',
    'pep@taskflow.local',
    'pegawai@taskflow.local',
    'katim@kmbteam.com',
    'pep@kmbteam.com',
    'kmb@kmbteam.com'
  );

  -- 1. KETUA TIM (ADMIN)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone, phone_change, phone_change_token, email_change_token_current, reauthentication_token, is_sso_user
  ) VALUES (
    v_admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'katim@kmbteam.com', v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"nama":"Ketua Tim (Admin)","role":"admin"}',
    now(), now(), '', '', '', '', null, '', '', '', '', false
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_admin_id, v_admin_id,
    jsonb_build_object('sub', v_admin_id::text, 'email', 'katim@kmbteam.com'),
    'email', v_admin_id::text, now(), now(), now()
  );

  INSERT INTO public.profiles (id, nama, email, role, spesialisasi, status_aktif, foto)
  VALUES (
    v_admin_id, 'Ketua Tim (Admin)', 'katim@kmbteam.com', 'admin', NULL, true,
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  )
  ON CONFLICT (id) DO UPDATE SET nama = EXCLUDED.nama, email = EXCLUDED.email, role = 'admin', status_aktif = true;


  -- 2. PEP (SIARAN)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone, phone_change, phone_change_token, email_change_token_current, reauthentication_token, is_sso_user
  ) VALUES (
    v_pep_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'pep@kmbteam.com', v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"nama":"PEP (Siaran)","role":"pep"}',
    now(), now(), '', '', '', '', null, '', '', '', '', false
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_pep_id, v_pep_id,
    jsonb_build_object('sub', v_pep_id::text, 'email', 'pep@kmbteam.com'),
    'email', v_pep_id::text, now(), now(), now()
  );

  INSERT INTO public.profiles (id, nama, email, role, spesialisasi, status_aktif, foto)
  VALUES (
    v_pep_id, 'PEP (Siaran)', 'pep@kmbteam.com', 'pep', NULL, true,
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  )
  ON CONFLICT (id) DO UPDATE SET nama = EXCLUDED.nama, email = EXCLUDED.email, role = 'pep', status_aktif = true;


  -- 3. PEGAWAI (KMB) - 1 User Digunakan Bersama
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone, phone_change, phone_change_token, email_change_token_current, reauthentication_token, is_sso_user
  ) VALUES (
    v_kmb_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'kmb@kmbteam.com', v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"nama":"Pegawai (KMB)","role":"pegawai"}',
    now(), now(), '', '', '', '', null, '', '', '', '', false
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    v_kmb_id, v_kmb_id,
    jsonb_build_object('sub', v_kmb_id::text, 'email', 'kmb@kmbteam.com'),
    'email', v_kmb_id::text, now(), now(), now()
  );

  INSERT INTO public.profiles (id, nama, email, role, spesialisasi, status_aktif, foto)
  VALUES (
    v_kmb_id, 'Pegawai (KMB)', 'kmb@kmbteam.com', 'pegawai', 'Video Editor', true,
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  )
  ON CONFLICT (id) DO UPDATE SET nama = EXCLUDED.nama, email = EXCLUDED.email, role = 'pegawai', status_aktif = true;

END $$;
