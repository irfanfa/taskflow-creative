import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Fitur Rekap Harian Tugas telah dinonaktifkan untuk semua role.',
    deactivated: true,
  });
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'Fitur Rekap Harian Tugas telah dinonaktifkan untuk semua role.',
    deactivated: true,
  });
}
