'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentProfile } from '@/lib/supabase/get-profile';
import { createAdminClient } from '@/lib/supabase/admin';
import type { UserSpecialization } from '@/types/database';

export async function createEmployee(formData: {
  nama: string;
  email: string;
  password?: string;
  spesialisasi: UserSpecialization;
  foto?: string;
}) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    return { success: false, error: 'Akses ditolak: Hanya Administrator yang berwenang menambah pegawai.' };
  }

  const { nama, email, password = 'Password123!', spesialisasi, foto } = formData;

  if (!nama || !email) {
    return { success: false, error: 'Nama dan alamat email wajib diisi.' };
  }

  try {
    const adminSupabase = createAdminClient() as any;

    // 1. Buat user di auth.users dengan status terkonfirmasi
    const { data: authUser, error: authError } = await adminSupabase.auth.admin.createUser({
      email: email.trim(),
      password: password || 'Password123!',
      email_confirm: true,
      user_metadata: {
        nama: nama.trim(),
        role: 'pegawai',
        spesialisasi,
        foto: foto || null,
        status_aktif: true,
      },
    });

    if (authError) {
      if (authError.message.includes('already exists')) {
        return { success: false, error: 'Email ini sudah terdaftar di sistem.' };
      }
      return { success: false, error: authError.message };
    }

    if (!authUser.user) {
      return { success: false, error: 'Gagal membuat akun autentikasi pegawai.' };
    }

    // 2. Sinkronisasi ke tabel profiles
    const { error: profileError } = await adminSupabase.from('profiles').upsert({
      id: authUser.user.id,
      nama: nama.trim(),
      email: email.trim(),
      role: 'pegawai',
      spesialisasi,
      status_aktif: true,
      foto: foto || null,
      deleted_at: null,
    });

    if (profileError) {
      return { success: false, error: `Akun dibuat namun profil gagal disinkronkan: ${profileError.message}` };
    }

    revalidatePath('/admin/pegawai');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

export async function updateEmployee(formData: {
  id: string;
  nama: string;
  spesialisasi?: UserSpecialization | null;
  status_aktif: boolean;
  foto?: string | null;
}) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    return { success: false, error: 'Akses ditolak: Hanya Administrator yang berwenang mengubah profil pengguna.' };
  }

  const { id, nama, spesialisasi, status_aktif, foto } = formData;

  try {
    const adminSupabase = createAdminClient() as any;

    // Periksa role user eksisting agar role 'pep' tidak tertimpa menjadi 'pegawai'
    const { data: existingUser } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', id)
      .single();

    const userRole = existingUser?.role || 'pegawai';

    // 1. Update profiles
    const { error: profileError } = await adminSupabase
      .from('profiles')
      .update({
        nama: nama.trim(),
        spesialisasi: spesialisasi || null,
        status_aktif,
        foto: foto || null,
      })
      .eq('id', id);

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    // 2. Update user metadata
    await adminSupabase.auth.admin.updateUserById(id, {
      user_metadata: {
        nama: nama.trim(),
        role: userRole,
        spesialisasi: spesialisasi || null,
        foto: foto || null,
        status_aktif,
      },
    });

    revalidatePath('/admin/pegawai');
    revalidatePath('/admin');
    revalidatePath('/pep/profil');
    revalidatePath('/pegawai/profil');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

export async function toggleEmployeeStatus(id: string, currentStatus: boolean) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    return { success: false, error: 'Akses ditolak: Hanya Administrator yang berwenang mengubah status pegawai.' };
  }

  const newStatus = !currentStatus;

  try {
    const adminSupabase = createAdminClient() as any;

    const { error } = await adminSupabase
      .from('profiles')
      .update({ status_aktif: newStatus })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    await adminSupabase.auth.admin.updateUserById(id, {
      user_metadata: { status_aktif: newStatus },
    });

    revalidatePath('/admin/pegawai');
    revalidatePath('/admin');
    return { success: true, newStatus };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

export async function resetEmployeePassword(id: string, newPassword: string) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    return { success: false, error: 'Akses ditolak: Hanya Administrator yang dapat mereset kata sandi pegawai.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Kata sandi baru minimal harus 6 karakter.' };
  }

  try {
    const adminSupabase = createAdminClient() as any;

    const { error } = await adminSupabase.auth.admin.updateUserById(id, {
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

export async function softDeleteEmployee(id: string) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    return { success: false, error: 'Akses ditolak: Hanya Administrator yang dapat menonaktifkan/menghapus pegawai.' };
  }

  try {
    const adminSupabase = createAdminClient() as any;

    // Soft delete: tandai deleted_at dan nonaktifkan status
    const { error } = await adminSupabase
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        status_aktif: false,
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/pegawai');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}

export async function restoreEmployee(id: string) {
  const currentProfile = await getCurrentProfile();
  if (!currentProfile || currentProfile.role !== 'admin') {
    return { success: false, error: 'Akses ditolak.' };
  }

  try {
    const adminSupabase = createAdminClient() as any;

    const { error } = await adminSupabase
      .from('profiles')
      .update({
        deleted_at: null,
        status_aktif: true,
      })
      .eq('id', id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/pegawai');
    revalidatePath('/admin');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server';
    return { success: false, error: msg };
  }
}
