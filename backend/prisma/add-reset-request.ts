import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetRequested" BOOLEAN NOT NULL DEFAULT false`;
  await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetRequestedAt" TIMESTAMP(3)`;
  console.log('Done: passwordResetRequested columns added');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
