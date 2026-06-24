const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const email = process.argv[2];
if (!email) { console.error('Usage: node delete-account.js <email>'); process.exit(1); }

async function main() {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, accountId: true } });
  if (!user) { console.log('User not found:', email); return; }
  console.log('Found user:', user.id, '| account:', user.accountId);

  await prisma.signupVerification.deleteMany({ where: { email } });
  await prisma.passwordResetRequest.deleteMany({ where: { userId: user.id } });

  // Delete account-level records first
  const accountId = user.accountId;
  await prisma.callLog.deleteMany({ where: { accountId } });
  await prisma.lead.deleteMany({ where: { accountId } });
  await prisma.campaign.deleteMany({ where: { accountId } });
  await prisma.user.deleteMany({ where: { accountId } });
  await prisma.account.delete({ where: { id: accountId } });

  console.log('Deleted successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
