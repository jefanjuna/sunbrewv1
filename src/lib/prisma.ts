import { PrismaClient } from '@prisma/client';

declare global {
  var __sunbrewPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__sunbrewPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__sunbrewPrisma = prisma;
}