// src/lib/prisma.ts
// This creates a single database connection shared across the app

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'], // logs DB queries in dev mode, remove in production
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
