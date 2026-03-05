// src/app/api/auth/signup/route.ts
// Creates a new player account (no password) and triggers a verification code email.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationCode } from '@/lib/resend';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { name, email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName     = name.trim();

    // Check for existing account
    const existing = await prisma.player.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Create player (no password in OTP flow)
    await prisma.player.create({
      data: { name: trimmedName, email: normalizedEmail },
    });

    // Generate and send verification code
    const code     = Math.floor(100_000 + Math.random() * 900_000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60_000);

    await prisma.verificationCode.deleteMany({ where: { email: normalizedEmail } });
    await prisma.verificationCode.create({ data: { email: normalizedEmail, codeHash, expiresAt } });
    await sendVerificationCode(normalizedEmail, code);

    return NextResponse.json({ success: true, codeSent: true });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
