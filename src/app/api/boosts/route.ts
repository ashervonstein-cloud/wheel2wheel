// src/app/api/boosts/route.ts
// A team's season Boosts: how many are left, and spending or withdrawing one.

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BOOSTS_PER_SEASON, canBoostRace } from '@/lib/scoring';

/** Resolves the team and confirms it belongs to the signed-in player. */
async function ownedTeam(req: NextRequest, teamId: string | null) {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: 'Not logged in' }, { status: 401 }) };
  if (!teamId) {
    return { error: NextResponse.json({ error: 'Choose a team first.' }, { status: 400 }) };
  }
  const playerId = (session.user as any).id;
  const team = await prisma.team.findFirst({ where: { id: teamId, playerId } });
  if (!team) {
    return { error: NextResponse.json({ error: "That team isn't yours." }, { status: 404 }) };
  }
  return { team };
}

async function summary(teamId: string, season: number) {
  const boosts = await prisma.boost.findMany({
    where: { teamId, season },
    include: { race: { select: { id: true, name: true, round: true, status: true } } },
    orderBy: { race: { round: 'asc' } },
  });
  return {
    limit: BOOSTS_PER_SEASON,
    used: boosts.length,
    remaining: Math.max(0, BOOSTS_PER_SEASON - boosts.length),
    boosts: boosts.map((b) => ({
      raceId: b.raceId,
      raceName: b.race.name,
      round: b.race.round,
      status: b.race.status,
    })),
  };
}

// GET /api/boosts?teamId=… — what this team has left and where it spent them
export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get('teamId');
  const { team, error } = await ownedTeam(req, teamId);
  if (error) return error;
  return NextResponse.json(await summary(team!.id, team!.season));
}

// POST /api/boosts { teamId, raceId } — spend one
export async function POST(req: NextRequest) {
  const { teamId, raceId } = await req.json().catch(() => ({}));
  const { team, error } = await ownedTeam(req, teamId ?? null);
  if (error) return error;

  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) return NextResponse.json({ error: 'Race not found.' }, { status: 404 });

  if (race.season !== team!.season) {
    return NextResponse.json(
      { error: 'That race is from a different season.' },
      { status: 400 },
    );
  }

  const eligible = canBoostRace(race);
  if (!eligible.ok) return NextResponse.json({ error: eligible.reason }, { status: 400 });

  const used = await prisma.boost.count({ where: { teamId: team!.id, season: team!.season } });
  if (used >= BOOSTS_PER_SEASON) {
    return NextResponse.json(
      { error: `You've used both Boosts for this season.` },
      { status: 400 },
    );
  }

  try {
    await prisma.boost.create({
      data: { teamId: team!.id, raceId: race.id, season: team!.season },
    });
  } catch {
    // Unique constraint: already boosted, which is the state they wanted anyway.
  }

  return NextResponse.json({ success: true, ...(await summary(team!.id, team!.season)) });
}

// DELETE /api/boosts { teamId, raceId } — take it back while the race is open
export async function DELETE(req: NextRequest) {
  const { teamId, raceId } = await req.json().catch(() => ({}));
  const { team, error } = await ownedTeam(req, teamId ?? null);
  if (error) return error;

  const race = await prisma.race.findUnique({ where: { id: raceId } });
  if (!race) return NextResponse.json({ error: 'Race not found.' }, { status: 404 });

  if (race.status !== 'OPEN') {
    return NextResponse.json(
      { error: "Selections have closed — this Boost is locked in." },
      { status: 400 },
    );
  }

  await prisma.boost.deleteMany({ where: { teamId: team!.id, raceId: race.id } });
  return NextResponse.json({ success: true, ...(await summary(team!.id, team!.season)) });
}
