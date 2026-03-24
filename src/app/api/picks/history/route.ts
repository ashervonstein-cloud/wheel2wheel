// src/app/api/picks/history/route.ts
// GET: returns all completed races with matchups, pick distribution, and the team's picks

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId');
  const excludeRaceId = searchParams.get('excludeRaceId') ?? '';

  if (!teamId) return NextResponse.json({ error: 'teamId required' }, { status: 400 });

  // Verify team belongs to this user
  const playerId = (session.user as any).id;
  const team = await prisma.team.findFirst({ where: { id: teamId, playerId } });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const races = await prisma.race.findMany({
    where: {
      status: 'COMPLETED',
      season: team.season,
      ...(excludeRaceId ? { id: { not: excludeRaceId } } : {}),
    },
    include: { matchups: { orderBy: { order: 'asc' } } },
    orderBy: { round: 'desc' },
  });

  if (races.length === 0) return NextResponse.json([]);

  const allMatchupIds = races.flatMap((r) => r.matchups.map((m) => m.id));

  // Pick distribution across all matchups
  const pickGroups = await prisma.pick.groupBy({
    by: ['matchupId', 'selection'],
    where: { matchupId: { in: allMatchupIds } },
    _count: { id: true },
  });

  // This team's picks
  const teamPicks = await prisma.pick.findMany({
    where: { teamId, matchupId: { in: allMatchupIds } },
    select: { matchupId: true, selection: true, isCorrect: true },
  });
  const teamPickMap = Object.fromEntries(teamPicks.map((p) => [p.matchupId, p]));

  // Race results (points / correct count)
  const raceResults = await prisma.raceResult.findMany({
    where: { teamId, raceId: { in: races.map((r) => r.id) } },
    select: { raceId: true, points: true, correct: true, total: true },
  });
  const resultMap = Object.fromEntries(raceResults.map((r) => [r.raceId, r]));

  const result = races.map((race) => ({
    id: race.id,
    name: race.name,
    round: race.round,
    country: race.country,
    isDoublePoints: race.isDoublePoints,
    result: resultMap[race.id] ?? null,
    matchups: race.matchups.map((matchup) => {
      const d1 = pickGroups.find((g) => g.matchupId === matchup.id && g.selection === 'driver1')?._count.id ?? 0;
      const d2 = pickGroups.find((g) => g.matchupId === matchup.id && g.selection === 'driver2')?._count.id ?? 0;
      const total = d1 + d2;
      const myPick = teamPickMap[matchup.id] ?? null;
      return {
        id: matchup.id,
        title: matchup.title,
        order: matchup.order,
        isBonus: matchup.isBonus,
        driver1Name: matchup.driver1Name,
        driver2Name: matchup.driver2Name,
        winnerId: matchup.winnerId,
        pickCounts: {
          driver1: d1,
          driver2: d2,
          total,
          driver1Pct: total > 0 ? Math.round((d1 / total) * 100) : 50,
          driver2Pct: total > 0 ? Math.round((d2 / total) * 100) : 50,
        },
        myPick: myPick?.selection ?? null,
        myPickCorrect: myPick?.isCorrect ?? null,
      };
    }),
  }));

  return NextResponse.json(result);
}
