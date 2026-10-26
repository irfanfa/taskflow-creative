import { NextResponse, type NextRequest } from 'next/server';
import { loginWithRateLimit } from '@/app/actions/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email atau username dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const result = await loginWithRateLimit({ email, password });

    return NextResponse.json(result, {
      status: result.success ? 200 : 401,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Terjadi kendala saat memproses login.';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
