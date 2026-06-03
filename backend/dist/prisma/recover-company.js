"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const adminRole = await prisma.role.findFirst({ where: { name: { equals: 'Admin', mode: 'insensitive' } } });
    const agentRole = await prisma.role.findFirst({ where: { name: { equals: 'Agent', mode: 'insensitive' } } });
    if (!adminRole || !agentRole)
        throw new Error('Roles not found');
    const account = await prisma.account.create({
        data: {
            name: 'Bytechsol LLC',
            status: client_1.AccountStatus.ACTIVE,
            approved: true,
            agentLimit: 10,
            numberPool: [
                { number: '+14422039259', callerName: 'Bytechsol LLC', areaCode: '+1' }
            ],
            approvedAt: new Date(),
        },
    });
    console.log(`Account created: ${account.name} (${account.id})`);
    const tempAdminPass = 'BtechAdmin@123';
    const adminHash = await bcryptjs_1.default.hash(tempAdminPass, 10);
    const admin = await prisma.user.create({
        data: {
            name: 'Hassan Quereshi',
            email: 'hassan@bytechsol.com',
            passwordHash: adminHash,
            roleId: adminRole.id,
            accountId: account.id,
        },
    });
    console.log(`Admin: ${admin.email}  |  Temp password: ${tempAdminPass}`);
    const tempAgentPass = 'TalhaAgent@123';
    const agentHash = await bcryptjs_1.default.hash(tempAgentPass, 10);
    const agent = await prisma.user.create({
        data: {
            name: 'talha',
            email: 'talha@ytechsol.com',
            passwordHash: agentHash,
            roleId: agentRole.id,
            accountId: account.id,
        },
    });
    console.log(`Agent: ${agent.email}  |  Temp password: ${tempAgentPass}`);
    console.log('\n--- SAVE THESE CREDENTIALS ---');
    console.log(`Admin login:  hassan@bytechsol.com  /  ${tempAdminPass}`);
    console.log(`Agent login:  talha@ytechsol.com    /  ${tempAgentPass}`);
    console.log('Number +14422039259 is already in company pool.');
}
main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=recover-company.js.map