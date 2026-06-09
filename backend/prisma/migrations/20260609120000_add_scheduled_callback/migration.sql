-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "ScheduledCallbackStatus" AS ENUM ('PENDING', 'DONE', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ScheduledCallback" (
  "id"            TEXT NOT NULL,
  "agentId"       TEXT NOT NULL,
  "accountId"     TEXT NOT NULL,
  "customerName"  TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "customerEmail" TEXT,
  "scheduledAt"   TIMESTAMP(3) NOT NULL,
  "notes"         TEXT,
  "status"        "ScheduledCallbackStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ScheduledCallback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ScheduledCallback"
  ADD CONSTRAINT "ScheduledCallback_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ScheduledCallback"
  ADD CONSTRAINT "ScheduledCallback_accountId_fkey"
  FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
