// src/lib/auth.ts
// Authentication configuration using NextAuth — passwordless OTP flow

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Code',
      credentials: {
        email: { label: 'Email', type: 'email' },
        code:  { label: 'Code',  type: 'text'  },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) return null;

        const email = credentials.email.trim().toLowerCase();

        // Find a non-expired verification code for this email
        const record = await prisma.verificationCode.findFirst({
          where: { email, expiresAt: { gt: new Date() } },
        });
        if (!record) return null;

        // Verify the code against the stored hash
        const valid = await bcrypt.compare(credentials.code.trim(), record.codeHash);
        if (!valid) return null;

        // Consume the code (one-time use)
        await prisma.verificationCode.delete({ where: { id: record.id } });

        // Fetch the player
        const player = await prisma.player.findUnique({ where: { email } });
        if (!player) return null;

        return {
          id:      player.id,
          name:    player.name,
          email:   player.email,
          isAdmin: player.isAdmin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id      = user.id;
        token.isAdmin = (user as any).isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id      = token.id;
        (session.user as any).isAdmin = token.isAdmin;
      }
      return session;
    },
  },
};
