import { NextRequest, NextResponse } from 'next/server';
import { processAutomatedReminders } from '@/lib/notifications/reminder-engine';
import { getCurrentProfile } from '@/lib/supabase/get-profile';

export const dynamic = 'force-dynamic';

async function handleRemindersCron(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Cek otorisasi jika CRON_SECRET disetel
    const isSecretValid = cronSecret && authHeader === `Bearer ${cronSecret}`;

    // Atau izinkan jika dipanggil oleh user role Admin dari dashboard
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

    const now = new Date();
    const result = await processAutomatedReminders(now);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      timestampWIB: new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'full',
        timeStyle: 'long',
      }).format(now),
      result,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Terjadi kesalahan sistem';
    console.error('[API Cron Reminders Error]:', errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleRemindersCron(req);
}

export async function POST(req: NextRequest) {
  return handleRemindersCron(req);
}
