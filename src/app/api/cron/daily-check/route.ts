// ============================================================================
// SmartCOI — Daily Notification Cron Job
// Runs daily at 8:00 AM UTC via Vercel Cron
// ============================================================================

import { NextResponse } from 'next/server';
import { checkAndScheduleNotifications } from '@/lib/notifications/scheduler';
import { processScheduledNotifications } from '@/lib/notifications/scheduler';

export const runtime = 'nodejs';
export const maxDuration = 60; // Allow up to 60 seconds

export async function POST(request: Request) {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET is not configured');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    // Step 1: Check expirations and schedule new notifications
    const scheduled = await checkAndScheduleNotifications();
    console.log(`[daily-check] Scheduled ${scheduled} new notifications`);

    // Step 2: Send all pending scheduled notifications
    const { sent, failed } = await processScheduledNotifications();
    console.log(`[daily-check] Sent ${sent}, failed ${failed}`);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      ok: true,
      scheduled,
      sent,
      failed,
      durationMs: duration,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[daily-check] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Also support GET for Vercel Cron (Vercel Cron sends GET requests)
export async function GET(request: Request) {
  return POST(request);
}
