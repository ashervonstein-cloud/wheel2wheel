// src/app/api/matchups/route.ts
// GET: returns the current relevant race and its matchups (OPEN > CLOSED > COMPLETED)

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  // Priority: OPEN first, then most recent CLOSED, then most recent COMPLETED
  let race = await prisma.race.findFirst({
    where: { status: 'OPEN' },
    include: { matchups: { orderBy: { order: 'asc' } } },
    orderBy: { round: 'asc' },
  });

  if (!race) {
    race = await prisma.race.findFirst({
      where: { status: { in: ['CLOSED', 'COMPLETED'] } },
      include: { matchups: { orderBy: { order: 'asc' } } },
      orderBy: { round: 'desc' },
    });
  }

  if (!race) {
    return NextResponse.json({ race: null, message: 'No race open for picks right now' });
  }

  // For closed/completed races, attach pick distribution counts to each matchup
  if (race.status === 'CLOSED' || race.status === 'COMPLETED') {
    const matchupIds = race.matchups.map((m) => m.id);
    const pickGroups = await prisma.pick.groupBy({
      by: ['matchupId', 'selection'],
      where: { matchupId: { in: matchupIds } },
      _count: { id: true },
    });

    const matchupsWithCounts = race.matchups.map((matchup) => {
      const d1 = pickGroups.find((g) => g.matchupId === matchup.id && g.selection === 'driver1')?._count.id ?? 0;
      const d2 = pickGroups.find((g) => g.matchupId === matchup.id && g.selection === 'driver2')?._count.id ?? 0;
      const total = d1 + d2;
      return {
        ...matchup,
        pickCounts: {
          driver1: d1,
          driver2: d2,
          total,
          driver1Pct: total > 0 ? Math.round((d1 / total) * 100) : 50,
          driver2Pct: total > 0 ? Math.round((d2 / total) * 100) : 50,
        },
      };
    });

    return NextResponse.json({ race: { ...race, matchups: matchupsWithCounts } });
  }

  return NextResponse.json({ race });
}
