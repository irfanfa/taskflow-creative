import { NextRequest, NextResponse } from 'next/server';
import { processRecurringTasksEngine } from '@/app/actions/productivity';
import { getCurrentProfile } from '@/lib/supabase/get-profile';

export const dynamic = 'force-dynamic';

async function handleRecurringCron(req: NextRequest) {
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

    const [recurringResult, holidayResult] = await Promise.all([
      processRecurringTasksEngine(),
      (async () => {
        try {
          const { syncUpcomingHolidayFlyers } = await import('@/lib/tasks/holiday-flyers');
          return await syncUpcomingHolidayFlyers();
        } catch (e) {
          console.error('[Error syncUpcomingHolidayFlyers in cron]:', e);
          return { success: false, error: String(e) };
        }
      })(),
    ]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      timestampWIB: new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'full',
        timeStyle: 'long',
      }).format(new Date()),
      recurringResult,
      holidayResult,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Terjadi kesalahan sistem';
    console.error('[API Cron Recurring Tasks Error]:', errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleRecurringCron(req);
}

export async function POST(req: NextRequest) {
  return handleRecurringCron(req);
}
