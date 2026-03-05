// src/app/api/leagues/[id]/leaderboard/route.ts
// GET: standings for a specific league

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const CURRENT_SEASON = 2025;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

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

  // Get total points for each team in this league
  const teamIds = league.leagueTeams.map((lt) => lt.teamId);

  const results = await prisma.raceResult.groupBy({
    by: ['teamId'],
    where: { teamId: { in: teamIds }, season: CURRENT_SEASON },
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
    .sort((a, b) => b.points - a.points) // highest points first
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return NextResponse.json({ league, leaderboard });
}
