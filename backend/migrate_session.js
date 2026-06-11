const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastSessionId" TEXT`
    );
    console.log('OK: lastSessionId column added to User table');
  } catch (e) {
    console.log('ERR:', e.message);
  }
  await prisma.$disconnect();
}
run();
