// src/app/api/leagues/join/route.ts
// POST: add a team to a league using an invite code

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { inviteCode, teamId } = await req.json();
  if (!inviteCode || !teamId) {
    return NextResponse.json({ error: 'Invite code and team ID are required' }, { status: 400 });
  }

  const playerId = (session.user as any).id;

  // Make sure the team belongs to the logged-in player
  const team = await prisma.team.findFirst({ where: { id: teamId, playerId } });
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  // Find the league by invite code
  const league = await prisma.league.findUnique({ where: { inviteCode } });
  if (!league) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
  }

  // Check if team is already in this league
  const existing = await prisma.leagueTeam.findUnique({
    where: { teamId_leagueId: { teamId, leagueId: league.id } },
  });
  if (existing) {
    return NextResponse.json({ error: 'Team is already in this league' }, { status: 400 });
  }

  await prisma.leagueTeam.create({
    data: { teamId, leagueId: league.id },
  });

  return NextResponse.json({ success: true, league });
}
