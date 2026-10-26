import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/supabase/get-profile';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect('/login');
  }

  if (profile.role === 'admin') {
    redirect('/admin');
  } else {
    redirect('/pegawai');
  }
}
