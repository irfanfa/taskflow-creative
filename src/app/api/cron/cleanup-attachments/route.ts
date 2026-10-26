import { NextRequest, NextResponse } from 'next/server';
import { cleanupExpiredCloudinaryAssets } from '@/lib/cloudinary/client';
import { getCurrentProfile } from '@/lib/supabase/get-profile';

export const dynamic = 'force-dynamic';

async function handleCleanupCron(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    const isSecretValid = cronSecret && authHeader === `Bearer ${cronSecret}`;

    let isAdmin = false;
    if (!isSecretValid) {
      const profile = await getCurrentProfile();
      isAdmin = profile?.role === 'admin';
    }

    if (cronSecret && !isSecretValid && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid cron secret or non-admin session' },
        { status: 401 }
      );
    }

    // Jalankan pembersihan aset lampiran yang berusia > 7 hari
    const result = await cleanupExpiredCloudinaryAssets(7);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      timestampWIB: new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'full',
        timeStyle: 'long',
      }).format(new Date()),
      result,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Terjadi kesalahan sistem pembersihan';
    console.error('[API Cron Cleanup Attachments Error]:', errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleCleanupCron(req);
}

export async function POST(req: NextRequest) {
  return handleCleanupCron(req);
}
