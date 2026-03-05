// src/app/api/matchups/route.ts
// GET: returns the current open race and its matchups

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  // Find the currently open race
  const race = await prisma.race.findFirst({
    where: { status: 'OPEN' },
    include: {
      matchups: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { round: 'asc' },
  });

  if (!race) {
    return NextResponse.json({ race: null, message: 'No race open for picks right now' });
  }

  return NextResponse.json(race);
}
