// src/app/api/picks/route.ts
// GET: get existing picks for the current race
// POST: submit picks for the current race

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId');
  const raceId = searchParams.get('raceId');

  if (!teamId || !raceId) {
    return NextResponse.json({ error: 'teamId and raceId are required' }, { status: 400 });
  }

  const picks = await prisma.pick.findMany({
    where: {
      teamId,
      matchup: { raceId },
    },
    include: { matchup: true },
  });

  return NextResponse.json(picks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { teamId, picks } = await req.json();
  // picks = [{ matchupId: "...", selection: "driver1" | "driver2" }, ...]

  if (!teamId || !picks?.length) {
    return NextResponse.json({ error: 'teamId and picks are required' }, { status: 400 });
  }

  const playerId = (session.user as any).id;

  // Verify the team belongs to this player
  const team = await prisma.team.findFirst({ where: { id: teamId, playerId } });
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  // Verify the race is still open for picks
  const matchup = await prisma.matchup.findUnique({
    where: { id: picks[0].matchupId },
    include: { race: true },
  });

  if (!matchup || matchup.race.status !== 'OPEN') {
    return NextResponse.json(
      { error: 'Selections are closed for this race' },
      { status: 400 }
    );
  }

  // Upsert all picks (create or update if they already made picks)
  const savedPicks = await Promise.all(
    picks.map((pick: { matchupId: string; selection: string }) =>
      prisma.pick.upsert({
        where: { teamId_matchupId: { teamId, matchupId: pick.matchupId } },
        update: { selection: pick.selection },
        create: { teamId, matchupId: pick.matchupId, selection: pick.selection },
      })
    )
  );

  return NextResponse.json({ success: true, picks: savedPicks });
}
