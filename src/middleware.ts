import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Lewati file statis, aset Next.js, dan icon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const { supabaseResponse, user, profile } = await updateSession(request);

  // Jangan redirect request Server Actions.
  // Request Server Actions memiliki header 'next-action'.
  // Jika middleware mengembalikan NextResponse.redirect() pada request Server Action,
  // runtime Next.js client akan crash dengan "An unexpected response was received from the server."
  if (request.headers.has('next-action')) {
    return supabaseResponse;
  }

  const isAuthRoute = pathname === '/login' || pathname === '/lupa-password';
  const isAdminRoute = pathname.startsWith('/admin');
  const isPegawaiRoute = pathname.startsWith('/pegawai');
  const isPepRoute = pathname.startsWith('/pep');
  const isSosmedRoute = pathname.startsWith('/sosmed');

  // 1. Kondisi jika pengguna BELUM LOGIN
  if (!user || !profile) {
    if (isAdminRoute || isPegawaiRoute || isPepRoute || isSosmedRoute) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return supabaseResponse;
  }

  // 2. Kondisi jika akun DINONAKTIFKAN
  if (!profile.status_aktif) {
    if (!isAuthRoute) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', 'inactive');
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  // 3. Kondisi jika pengguna SUDAH LOGIN namun mengakses halaman Auth (/login, /lupa-password) atau Root (/)
  if (isAuthRoute || pathname === '/') {
    if (profile.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (profile.role === 'pep') {
      return NextResponse.redirect(new URL('/pep', request.url));
    }
    if (profile.role === 'sosmed') {
      return NextResponse.redirect(new URL('/sosmed', request.url));
    }
    return NextResponse.redirect(new URL('/pegawai', request.url));
  }

  // Helper untuk mendapatkan default home route per role
  const getRoleHome = (role: string) => {
    if (role === 'admin') return '/admin';
    if (role === 'pep') return '/pep';
    if (role === 'sosmed') return '/sosmed';
    return '/pegawai';
  };

  // Aturan Khusus PEP: TIDAK BISA MELIHAT KALENDER
  if (profile.role === 'pep' && pathname.includes('kalender')) {
    return NextResponse.redirect(new URL('/pep', request.url));
  }

  // 4. Proteksi rute /admin/* (HANYA UNTUK KETUA TIM / ADMIN)
  if (isAdminRoute && profile.role !== 'admin') {
    return NextResponse.redirect(new URL(getRoleHome(profile.role), request.url));
  }

  // 5. Proteksi rute /pep/* (HANYA UNTUK PEP SIARAN)
  if (isPepRoute && profile.role !== 'pep') {
    return NextResponse.redirect(new URL(getRoleHome(profile.role), request.url));
  }

  // 6. Proteksi rute /sosmed/* (HANYA UNTUK PENGELOLA SOSMED)
  if (isSosmedRoute && profile.role !== 'sosmed') {
    return NextResponse.redirect(new URL(getRoleHome(profile.role), request.url));
  }

  // 7. Proteksi rute /pegawai/* (HANYA UNTUK PEGAWAI KMB DAN REDIRECT KHUSUS PENGELOLA SOSMED)
  if (isPegawaiRoute) {
    if (pathname.startsWith('/pegawai/tugas/') && profile.role === 'sosmed') {
      const taskId = pathname.replace('/pegawai/tugas/', '');
      return NextResponse.redirect(new URL(`/sosmed/tugas/${taskId}`, request.url));
    } else if (profile.role !== 'pegawai') {
      return NextResponse.redirect(new URL(getRoleHome(profile.role), request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
