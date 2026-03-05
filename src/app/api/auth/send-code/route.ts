// src/app/api/auth/send-code/route.ts
// Generates a 6-digit OTP, stores a bcrypt hash in the DB, and emails it via Resend.

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { sendVerificationCode } from '@/lib/resend';

export async function POST(req: NextRequest) {
  try {
    const { email, skipPlayerCheck } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // For login flow: verify account exists before sending
    if (!skipPlayerCheck) {
      const player = await prisma.player.findUnique({ where: { email: normalizedEmail } });
      if (!player) {
        return NextResponse.json({ error: 'No account found with that email' }, { status: 404 });
      }
    }

    // Rate limit: don't send more than one code per 60 seconds
    const recent = await prisma.verificationCode.findFirst({
      where: {
        email: normalizedEmail,
        createdAt: { gt: new Date(Date.now() - 60_000) },
      },
    });
    if (recent) {
      return NextResponse.json(
        { error: 'A code was recently sent. Please wait a moment before requesting another.' },
        { status: 429 }
      );
    }

    // Delete any existing (expired or unused) codes for this email
    await prisma.verificationCode.deleteMany({ where: { email: normalizedEmail } });

    // Generate 6-digit code and hash it
    const code     = Math.floor(100_000 + Math.random() * 900_000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60_000); // 10 minutes

    await prisma.verificationCode.create({
      data: { email: normalizedEmail, codeHash, expiresAt },
    });

    await sendVerificationCode(normalizedEmail, code);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('send-code error:', err);
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 });
  }
}
