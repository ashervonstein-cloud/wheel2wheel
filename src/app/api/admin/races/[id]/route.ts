// src/app/api/admin/races/[id]/route.ts
// Admin: update race status, enter results, trigger scoring

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculatePoints, gradepicks } from '@/lib/scoring';

function isAdmin(session: any) {
  return session?.user?.isAdmin === true;
}

// PATCH: update race (status change OR submit results)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session)) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const { status, results } = body;
  // results = [{ matchupId: "...", winnerId: "driver1" | "driver2" }, ...]

  const race = await prisma.race.findUnique({
    where: { id: params.id },
    include: { matchups: true },
  });
  if (!race) return NextResponse.json({ error: 'Race not found' }, { status: 404 });

  // --- Just a status update (e.g. UPCOMING -> OPEN -> CLOSED) ---
  if (status && !results) {
    const updated = await prisma.race.update({
      where: { id: params.id },
      data: { status },
    });
    return NextResponse.json(updated);
  }

  // --- Processing final results ---
  if (results) {
    // 1. Save the winner for each matchup
    await Promise.all(
      results.map((r: { matchupId: string; winnerId: string }) =>
        prisma.matchup.update({
          where: { id: r.matchupId },
          data: { winnerId: r.winnerId },
        })
      )
    );

    // 2. Get all picks for this race
    const allPicks = await prisma.pick.findMany({
      where: { matchup: { raceId: params.id } },
    });

    // 3. Group picks by team
    const picksByTeam = new Map<string, typeof allPicks>();
    for (const pick of allPicks) {
      if (!picksByTeam.has(pick.teamId)) picksByTeam.set(pick.teamId, []);
      picksByTeam.get(pick.teamId)!.push(pick);
    }

    // 4. Score each team
    const winners = results.map((r: { matchupId: string; winnerId: string }) => ({
      matchupId: r.matchupId,
      winnerId: r.winnerId,
    }));

    const scoringPromises: Promise<any>[] = [];

    for (const [teamId, teamPicks] of picksByTeam) {
      const { correct, total } = gradepicks(
        teamPicks.map((p) => ({ matchupId: p.matchupId, selection: p.selection })),
        winners
      );
      const points = calculatePoints(correct, total, race.isDoublePoints);

      // Mark each pick as correct/incorrect
      scoringPromises.push(
        ...teamPicks.map((pick) => {
          const winner = winners.find((w: any) => w.matchupId === pick.matchupId);
          return prisma.pick.update({
            where: { id: pick.id },
            data: { isCorrect: winner?.winnerId === pick.selection },
          });
        })
      );

      // Save race result for this team
      scoringPromises.push(
        prisma.raceResult.upsert({
          where: { teamId_raceId: { teamId, raceId: params.id } },
          update: { points, correct, total },
          create: { teamId, raceId: params.id, season: race.season, points, correct, total },
        })
      );
    }

    await Promise.all(scoringPromises);

    // 5. Mark race as completed
    await prisma.race.update({
      where: { id: params.id },
      data: { status: 'COMPLETED' },
    });

    return NextResponse.json({ success: true, message: 'Results processed and points awarded' });
  }

  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
}
