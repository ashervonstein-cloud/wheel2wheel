// src/app/api/admin/reset/route.ts
// Admin only: wipe all race/pick/result data for a clean-slate season restart

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function isAdmin(session: any) {
  return session?.user?.isAdmin === true;
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  // Delete in dependency order (children before parents)
  const [picks, raceResults, matchups, races] = await prisma.$transaction([
    prisma.pick.deleteMany({}),
    prisma.raceResult.deleteMany({}),
    prisma.matchup.deleteMany({}),
    prisma.race.deleteMany({}),
  ]);

  return NextResponse.json({
    success: true,
    deleted: {
      picks: picks.count,
      raceResults: raceResults.count,
      matchups: matchups.count,
      races: races.count,
    },
  });
}
