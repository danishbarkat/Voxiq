-- AlterTable: Add package & feature flags to Account
ALTER TABLE "Account"
  ADD COLUMN IF NOT EXISTS "packageName"      TEXT,
  ADD COLUMN IF NOT EXISTS "canOutboundCall"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "canInboundCall"   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "canSendSms"       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "canRecord"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "monthlyCallLimit" INTEGER,
  ADD COLUMN IF NOT EXISTS "monthlySmsLimit"  INTEGER;
