import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database, Profile } from '@/types/database';

export async function updateSession(request: NextRequest): Promise<{
  supabaseResponse: NextResponse;
  user: unknown;
  profile: Profile | null;
}> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Jika env belum dikonfigurasi (misal local setup baru), loloskan agar tidak error fatal
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project') || supabaseUrl.includes('placeholder')) {
    return { supabaseResponse, user: null, profile: null };
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Ambil user auth saat ini
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;

  if (user) {
    // Ambil data profile dari tabel profiles
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    profile = data as Profile | null;
  }

  return { supabaseResponse, user, profile };
}
