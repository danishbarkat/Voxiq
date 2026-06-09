"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const SUPER_ADMIN_ACCOUNT_ID = 'super-admin-account';
const SUPER_ADMIN_EMAIL = 'barkatdanish30@gmail.com';
async function main() {
    console.log('⚠️  Deleting all data except superadmin...\n');
    const cl = await prisma.callLog.deleteMany({});
    console.log(`✓ CallLogs deleted: ${cl.count}`);
    const sms = await prisma.smsMessage.deleteMany({});
    console.log(`✓ SMS messages deleted: ${sms.count}`);
    const al = await prisma.agentList.deleteMany({});
    console.log(`✓ AgentList deleted: ${al.count}`);
    const leads = await prisma.lead.deleteMany({});
    console.log(`✓ Leads deleted: ${leads.count}`);
    const lists = await prisma.list.deleteMany({});
    console.log(`✓ Lists deleted: ${lists.count}`);
    const camps = await prisma.campaign.deleteMany({});
    console.log(`✓ Campaigns deleted: ${camps.count}`);
    try {
        const vmt = await prisma.voicemailTemplate.deleteMany({});
        console.log(`✓ VoicemailTemplates deleted: ${vmt.count}`);
    }
    catch {
        console.log('  VoicemailTemplate skipped (not in schema)');
    }
    const users = await prisma.user.deleteMany({
        where: { email: { not: SUPER_ADMIN_EMAIL } },
    });
    console.log(`✓ Users deleted: ${users.count}`);
    const accounts = await prisma.account.deleteMany({
        where: { id: { not: SUPER_ADMIN_ACCOUNT_ID } },
    });
    console.log(`✓ Accounts/Companies deleted: ${accounts.count}`);
    console.log('\n✅ Done! Only superadmin remains.');
}
main()
    .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=reset-except-superadmin.js.map