'use server';

import { createClient } from '@/lib/supabase/server';
import type { Profile, UserRole } from '@/types/database';

interface RateLimitRecord {
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
}

// In-memory rate limiter per email identifier
const loginAttempts = new Map<string, RateLimitRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 Menit
const WINDOW_DURATION_MS = 15 * 60 * 1000;

export async function loginWithRateLimit(formData: {
  email: string;
  password: string;
}): Promise<{
  success: boolean;
  role?: UserRole;
  nama?: string;
  error?: string;
}> {
  const { email, password } = formData;

  // 1. Validasi Input Server-Side
  if (!email || !password) {
    return { success: false, error: 'Email atau username dan kata sandi wajib diisi.' };
  }

  let cleanEmail = email.trim().toLowerCase();

  // Mapping username shortcut ke email resmi sistem KMB Team
  const USERNAME_MAP: Record<string, string> = {
    katim: 'katim@kmbteam.com',
    admin: 'katim@kmbteam.com',
    pep: 'pep@kmbteam.com',
    kmb: 'kmb@kmbteam.com',
    pegawai: 'kmb@kmbteam.com',
    sosmed: 'sosmed@kmbteam.com',
  };

  if (USERNAME_MAP[cleanEmail]) {
    cleanEmail = USERNAME_MAP[cleanEmail];
  } else if (!cleanEmail.includes('@')) {
    cleanEmail = `${cleanEmail}@kmbteam.com`;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return { success: false, error: 'Format email atau username tidak valid.' };
  }

  // 2. Evaluasi Rate Limiter
  const now = Date.now();
  const record = loginAttempts.get(cleanEmail);

  if (record && record.blockedUntil && now < record.blockedUntil) {
    const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000);
    return {
      success: false,
      error: `Terlalu banyak percobaan login gagal. Demi keamanan akun, silakan tunggu ${remainingMinutes} menit lagi sebelum mencoba kembali.`,
    };
  }

  // 3. Autentikasi dengan Supabase
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError || !authData.user) {
      // Catat kegagalan login untuk rate limiting
      const currentRecord = loginAttempts.get(cleanEmail) || {
        attempts: 0,
        lastAttempt: now,
      };

      if (now - currentRecord.lastAttempt > WINDOW_DURATION_MS) {
        currentRecord.attempts = 1;
      } else {
        currentRecord.attempts += 1;
      }
      currentRecord.lastAttempt = now;

      if (currentRecord.attempts >= MAX_FAILED_ATTEMPTS) {
        currentRecord.blockedUntil = now + BLOCK_DURATION_MS;
        loginAttempts.set(cleanEmail, currentRecord);
        return {
          success: false,
          error: `Batas percobaan login terlampaui (${MAX_FAILED_ATTEMPTS} kali gagal). Akun Anda dikunci sementara selama 15 menit.`,
        };
      }

      loginAttempts.set(cleanEmail, currentRecord);
      const sisa = MAX_FAILED_ATTEMPTS - currentRecord.attempts;

      if (authError?.message?.includes('Invalid login credentials')) {
        return {
          success: false,
          error: `Email atau kata sandi tidak cocok. Sisa percobaan: ${sisa} kali.`,
        };
      }

      return {
        success: false,
        error: authError?.message || 'Gagal masuk ke sistem. Silakan periksa kembali kredensial Anda.',
      };
    }

    // 4. Verifikasi Profil dan Status Akun
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, nama, email, role, status_aktif')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return { success: false, error: 'Data profil pengguna tidak ditemukan di basis data.' };
    }

    const userProfile = profile as unknown as Profile;
    if (!userProfile.status_aktif) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Akun Anda dinonaktifkan oleh administrator. Silakan hubungi manajemen tim.',
      };
    }

    // 5. Berhasil: Reset catatan percobaan gagal
    loginAttempts.delete(cleanEmail);

    return {
      success: true,
      role: userProfile.role,
      nama: userProfile.nama,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
    return { success: false, error: msg };
  }
}
