// src/app/api/admin/sync-calendar/route.ts
// Returns upcoming F1 races parsed from the official ICS calendar feed.
// Admin-only.

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchF1Calendar } from '@/lib/f1calendar';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const races = await fetchF1Calendar();
    // Filter to future races only (race date in the future)
    const now = new Date();
    const upcoming = races.filter(r => new Date(r.raceDate) > now);
    return NextResponse.json(upcoming);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch calendar' }, { status: 500 });
  }
}
