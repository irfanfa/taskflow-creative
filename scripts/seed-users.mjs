import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Muat variabel environment dari .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const SEED_USERS = [
  {
    email: 'admin@taskflow.local',
    password: 'Password123!',
    nama: 'Bambang Pratama',
    role: 'admin',
    spesialisasi: null,
    foto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'budi.editor@taskflow.local',
    password: 'Password123!',
    nama: 'Budi Santoso',
    role: 'pegawai',
    spesialisasi: 'Video Editor',
    foto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'siti.editor@taskflow.local',
    password: 'Password123!',
    nama: 'Siti Rahma',
    role: 'pegawai',
    spesialisasi: 'Video Editor',
    foto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'andi.desain@taskflow.local',
    password: 'Password123!',
    nama: 'Andi Wijaya',
    role: 'pegawai',
    spesialisasi: 'Desainer Grafis',
    foto: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  },
  {
    email: 'dewi.desain@taskflow.local',
    password: 'Password123!',
    nama: 'Dewi Lestari',
    role: 'pegawai',
    spesialisasi: 'Desainer Grafis',
    foto: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  },
];

async function seed() {
  console.log('Menghubungkan ke Supabase:', supabaseUrl);

  // 1. Ambil seluruh user yang sudah ada
  const { data: userListData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('Gagal mengambil daftar user:', listError);
    return;
  }

  const existingUsers = userListData.users || [];
  console.log(`Ditemukan ${existingUsers.length} user yang sudah ada di Supabase.`);

  for (const item of SEED_USERS) {
    const existing = existingUsers.find((u) => u.email === item.email);

    let userId = existing ? existing.id : null;

    if (existing) {
      console.log(`User ${item.email} sudah ada di auth.users. Mereset password & metadata...`);
      const { data: updated, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existing.id,
        {
          password: item.password,
          email_confirm: true,
          user_metadata: {
            nama: item.nama,
            role: item.role,
            spesialisasi: item.spesialisasi,
            foto: item.foto,
            status_aktif: true,
          },
        }
      );

      if (updateError) {
        console.error(`Gagal update user ${item.email}:`, updateError);
      } else {
        userId = updated.user.id;
      }
    } else {
      console.log(`Membuat user ${item.email} melalui Supabase Auth Admin API...`);
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: item.email,
        password: item.password,
        email_confirm: true,
        user_metadata: {
          nama: item.nama,
          role: item.role,
          spesialisasi: item.spesialisasi,
          foto: item.foto,
          status_aktif: true,
        },
      });

      if (createError) {
        console.error(`Gagal membuat user ${item.email}:`, createError);
        continue;
      }
      userId = created.user.id;
    }

    // Pastikan record di public.profiles sinkron
    if (userId) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          nama: item.nama,
          email: item.email,
          role: item.role,
          spesialisasi: item.spesialisasi,
          status_aktif: true,
          foto: item.foto,
        });

      if (profileError) {
        console.error(`Peringatan saat upsert profil ${item.email}:`, profileError);
      } else {
        console.log(`✓ Berhasil sync profil: ${item.nama} (${item.role})`);
      }
    }
  }

  console.log('\n--- SEED SELESAI DENGAN SUKSES! ---');

  // Tes login salah satu user untuk membuktikan tidak ada lagi error 500
  console.log('\nMenguji login admin@taskflow.local...');
  const { data: loginData, error: loginError } = await supabaseAdmin.auth.signInWithPassword({
    email: 'admin@taskflow.local',
    password: 'Password123!',
  });

  if (loginError) {
    console.error('❌ Login test gagal:', loginError);
  } else {
    console.log('✅ Login test BERHASIL! User ID:', loginData.user?.id);
  }
}

seed();
