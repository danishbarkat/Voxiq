"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const SUPERADMIN_ACCOUNT_ID = 'super-admin-account';
    const accounts = await prisma.account.findMany({
        where: { id: { not: SUPERADMIN_ACCOUNT_ID } },
        select: { id: true, name: true },
    });
    if (accounts.length === 0) {
        console.log('No company accounts found to remove.');
        return;
    }
    console.log(`Found ${accounts.length} company account(s):`);
    accounts.forEach(a => console.log(`  - ${a.name} (${a.id})`));
    const accountIds = accounts.map(a => a.id);
    await prisma.agentList.deleteMany({ where: { User: { accountId: { in: accountIds } } } });
    await prisma.callLog.deleteMany({ where: { agent: { accountId: { in: accountIds } } } });
    await prisma.callLog.deleteMany({ where: { lead: { accountId: { in: accountIds } } } });
    await prisma.campaignList.deleteMany({ where: { campaign: { accountId: { in: accountIds } } } });
    await prisma.lead.deleteMany({ where: { accountId: { in: accountIds } } });
    await prisma.campaign.deleteMany({ where: { accountId: { in: accountIds } } });
    await prisma.list.deleteMany({ where: { accountId: { in: accountIds } } });
    await prisma.voicemailTemplate.deleteMany({ where: { accountId: { in: accountIds } } });
    await prisma.user.deleteMany({ where: { accountId: { in: accountIds } } });
    await prisma.team.deleteMany({ where: { accountId: { in: accountIds } } });
    await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
    console.log('Done. All company accounts and their data removed.');
}
main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=cleanup-companies.js.map