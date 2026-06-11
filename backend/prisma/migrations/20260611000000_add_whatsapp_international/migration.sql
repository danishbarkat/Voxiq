-- Add WhatsApp feature flag and monthly limit
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "canSendWhatsapp" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "monthlyWhatsappLimit" INTEGER;
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "canCallInternational" BOOLEAN NOT NULL DEFAULT true;

-- Add channel column to SmsMessage (default 'sms' for existing records)
ALTER TABLE "SmsMessage" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'sms';
