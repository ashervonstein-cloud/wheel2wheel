// src/app/api/admin/races/route.ts
// Admin only: create a new race and its matchups

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function isAdmin(session: any) {
  return session?.user?.isAdmin === true;
}

// GET: list all races
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const races = await prisma.race.findMany({
    include: { matchups: { orderBy: { order: 'asc' } } },
    orderBy: [{ season: 'desc' }, { round: 'asc' }],
  });

  return NextResponse.json(races);
}

// POST: create a new race with matchups
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const {
    name,
    round,
    season,
    country,
    circuit,
    selectionsOpenAt,
    selectionsCloseAt,
    raceDate,
    hasSprint,
    isDoublePoints,
    matchups, // array of { title, order, driver1Name, driver2Name, isBonus }
  } = await req.json();

  const race = await prisma.race.create({
    data: {
      name,
      round,
      season,
      country,
      circuit,
      selectionsOpenAt: new Date(selectionsOpenAt),
      selectionsCloseAt: new Date(selectionsCloseAt),
      raceDate: new Date(raceDate),
      hasSprint: hasSprint ?? false,
      isDoublePoints: isDoublePoints ?? false,
      status: 'UPCOMING',
      matchups: {
        create: matchups.map((m: any) => ({
          title: m.title,
          order: m.order,
          driver1Name: m.driver1Name,
          driver2Name: m.driver2Name,
          isBonus: m.isBonus ?? false,
        })),
      },
    },
    include: { matchups: true },
  });

  return NextResponse.json(race);
}
