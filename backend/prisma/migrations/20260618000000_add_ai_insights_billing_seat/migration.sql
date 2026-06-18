-- Add AI insights, billing cycle, and seat count to Account
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "canAiInsights" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT DEFAULT 'monthly';
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "seatCount" INTEGER DEFAULT 1;
