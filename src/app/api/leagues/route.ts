// src/app/api/leagues/route.ts
// GET: list public leagues (and leagues you're in)
// POST: create a new league

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const CURRENT_SEASON = 2026;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  // Return all public leagues for this season
  const leagues = await prisma.league.findMany({
    where: { season: CURRENT_SEASON, isPublic: true },
    include: {
      _count: { select: { leagueTeams: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(leagues);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { name, isPublic } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'League name is required' }, { status: 400 });
  }

  const league = await prisma.league.create({
    data: {
      name: name.trim(),
      isPublic: isPublic ?? true,
      season: CURRENT_SEASON,
    },
  });

  return NextResponse.json({ 
    ...league,
    joinLink: `${process.env.NEXTAUTH_URL}/leagues/join/${league.inviteCode}`
  });
}
