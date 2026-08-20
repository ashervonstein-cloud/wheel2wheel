// src/app/api/races/next/route.ts
// GET: public — the next upcoming race's circuit + timezone, for the nav clock.

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GP_TIMEZONE } from '@/lib/circuitTimezones';

// Which race is "next" changes over time — never prerender/cache this statically.
export const dynamic = 'force-dynamic';

export async function GET() {
  let race = await prisma.race.findFirst({
    where: { raceDate: { gte: new Date() } },
    orderBy: { raceDate: 'asc' },
    select: { name: true, circuit: true, raceDate: true },
  });

  // Season's over — fall back to the most recent race so the clock still shows something.
  if (!race) {
    race = await prisma.race.findFirst({
      orderBy: { raceDate: 'desc' },
      select: { name: true, circuit: true, raceDate: true },
    });
  }

  if (!race) return NextResponse.json({ race: null });

  return NextResponse.json({
    race: {
      circuit: race.circuit,
      raceDate: race.raceDate,
      timezone: GP_TIMEZONE[race.name] ?? null,
    },
  });
}
