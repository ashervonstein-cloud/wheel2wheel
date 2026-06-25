// src/app/api/leagues/[id]/leaderboard/route.ts
// GET: standings for a specific league

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const CURRENT_SEASON = 2026;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const throughRound = req.nextUrl.searchParams.get('throughRound');

  const league = await prisma.league.findUnique({
    where: { id: params.id },
    include: {
      leagueTeams: {
        include: {
          team: {
            include: { player: { select: { name: true } } },
          },
        },
      },
    },
  });

  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });

  const teamIds = league.leagueTeams.map((lt) => lt.teamId);

  // If filtering by round, find the race IDs up to that round
  let raceIdFilter: string[] | undefined;
  if (throughRound) {
    const races = await prisma.race.findMany({
      where: {
        season: CURRENT_SEASON,
        status: 'COMPLETED',
        round: { lte: parseInt(throughRound, 10) },
      },
      select: { id: true },
    });
    raceIdFilter = races.map((r) => r.id);
  }

  const results = await prisma.raceResult.groupBy({
    by: ['teamId'],
    where: {
      teamId: { in: teamIds },
      season: CURRENT_SEASON,
      ...(raceIdFilter ? { raceId: { in: raceIdFilter } } : {}),
    },
    _sum: { points: true, correct: true, total: true },
  });

  const pointsMap = new Map(results.map((r) => [r.teamId, r._sum]));

  // Build the leaderboard
  const leaderboard = league.leagueTeams
    .map((lt) => {
      const pts = pointsMap.get(lt.teamId);
      return {
        teamId: lt.teamId,
        teamName: lt.team.name,
        playerName: lt.team.player.name,
        points: pts?.points ?? 0,
        correct: pts?.correct ?? 0,
        picks: pts?.total ?? 0,
      };
    })
    .sort((a, b) => b.points - a.points)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  // Fetch completed races for the round selector
  const completedRaces = await prisma.race.findMany({
    where: { season: CURRENT_SEASON, status: 'COMPLETED' },
    select: { round: true, name: true },
    orderBy: { round: 'asc' },
  });

  return NextResponse.json({ league, leaderboard, completedRaces });
}
