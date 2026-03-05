// src/app/api/teams/route.ts
// GET: list all teams for the logged-in player
// POST: create a new team

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const CURRENT_SEASON = 2025;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const playerId = (session.user as any).id;

  const teams = await prisma.team.findMany({
    where: { playerId, season: CURRENT_SEASON },
    include: {
      leagueTeams: {
        include: { league: true },
      },
    },
  });

  return NextResponse.json(teams);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
  }

  const playerId = (session.user as any).id;

  const team = await prisma.team.create({
    data: {
      name: name.trim(),
      season: CURRENT_SEASON,
      playerId,
    },
  });

  return NextResponse.json(team);
}
