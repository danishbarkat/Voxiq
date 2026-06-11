const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const sqls = [
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ScheduledCallbackStatus') THEN CREATE TYPE "ScheduledCallbackStatus" AS ENUM ('PENDING', 'DONE', 'CANCELLED'); END IF; END $$`,
    `CREATE TABLE IF NOT EXISTS "ScheduledCallback" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "agentId" TEXT NOT NULL,
      "accountId" TEXT NOT NULL,
      "customerName" TEXT NOT NULL,
      "customerPhone" TEXT NOT NULL,
      "customerEmail" TEXT,
      "scheduledAt" TIMESTAMP(3) NOT NULL,
      "notes" TEXT,
      "status" "ScheduledCallbackStatus" NOT NULL DEFAULT 'PENDING',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ScheduledCallback_pkey" PRIMARY KEY ("id")
    )`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduledCallback_agentId_fkey') THEN ALTER TABLE "ScheduledCallback" ADD CONSTRAINT "ScheduledCallback_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`,
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ScheduledCallback_accountId_fkey') THEN ALTER TABLE "ScheduledCallback" ADD CONSTRAINT "ScheduledCallback_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE; END IF; END $$`
  ];
  for (const sql of sqls) {
    try { await prisma.$executeRawUnsafe(sql); console.log('OK:', sql.slice(0, 60)); }
    catch (e) { console.log('ERR:', e.message.slice(0, 100)); }
  }
  await prisma.$disconnect();
}
run();
