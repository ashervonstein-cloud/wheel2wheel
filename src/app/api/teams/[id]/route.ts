// src/app/api/teams/[id]/route.ts
// PATCH: rename a team (owner only)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const playerId = (session.user as any).id;
  const { name } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
  }

  // Make sure this team belongs to the logged-in player
  const team = await prisma.team.findUnique({ where: { id: params.id } });
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  if (team.playerId !== playerId) return NextResponse.json({ error: 'Not your team' }, { status: 403 });

  const updated = await prisma.team.update({
    where: { id: params.id },
    data: { name: name.trim() },
  });

  return NextResponse.json(updated);
}
