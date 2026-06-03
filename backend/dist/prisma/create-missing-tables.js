"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    await prisma.$executeRaw `
    CREATE TABLE IF NOT EXISTS "SignupVerification" (
      "id"        TEXT        NOT NULL,
      "email"     TEXT        NOT NULL,
      "otpCode"   TEXT        NOT NULL,
      "payload"   JSONB       NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SignupVerification_pkey" PRIMARY KEY ("id")
    )
  `;
    await prisma.$executeRaw `
    CREATE UNIQUE INDEX IF NOT EXISTS "SignupVerification_email_key"
    ON "SignupVerification"("email")
  `;
    console.log('SignupVerification table created (or already exists).');
}
main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=create-missing-tables.js.map