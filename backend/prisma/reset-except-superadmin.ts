import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SUPER_ADMIN_ACCOUNT_ID = 'super-admin-account';
const SUPER_ADMIN_EMAIL = 'barkatdanish30@gmail.com';

async function main() {
  console.log('⚠️  Deleting all data except superadmin...\n');

  // 1. Call logs (reference leads + users)
  const cl = await prisma.callLog.deleteMany({});
  console.log(`✓ CallLogs deleted: ${cl.count}`);

  // 2. SMS messages
  const sms = await prisma.smsMessage.deleteMany({});
  console.log(`✓ SMS messages deleted: ${sms.count}`);

  // 3. AgentList junction
  const al = await prisma.agentList.deleteMany({});
  console.log(`✓ AgentList deleted: ${al.count}`);

  // 4. Leads
  const leads = await prisma.lead.deleteMany({});
  console.log(`✓ Leads deleted: ${leads.count}`);

  // 5. Lists
  const lists = await prisma.list.deleteMany({});
  console.log(`✓ Lists deleted: ${lists.count}`);

  // 6. Campaigns
  const camps = await prisma.campaign.deleteMany({});
  console.log(`✓ Campaigns deleted: ${camps.count}`);

  // 7. Voicemail templates
  try {
    const vmt = await (prisma as any).voicemailTemplate.deleteMany({});
    console.log(`✓ VoicemailTemplates deleted: ${vmt.count}`);
  } catch { console.log('  VoicemailTemplate skipped (not in schema)'); }

  // 8. Users except superadmin
  const users = await prisma.user.deleteMany({
    where: { email: { not: SUPER_ADMIN_EMAIL } },
  });
  console.log(`✓ Users deleted: ${users.count}`);

  // 9. Accounts except super-admin-account
  const accounts = await prisma.account.deleteMany({
    where: { id: { not: SUPER_ADMIN_ACCOUNT_ID } },
  });
  console.log(`✓ Accounts/Companies deleted: ${accounts.count}`);

  console.log('\n✅ Done! Only superadmin remains.');
}

main()
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
