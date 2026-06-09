-- AlterTable: Add trial and requested-package fields to Account
ALTER TABLE "Account"
  ADD COLUMN IF NOT EXISTS "isTrial"          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "trialEndsAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "requestedPackage" TEXT;
