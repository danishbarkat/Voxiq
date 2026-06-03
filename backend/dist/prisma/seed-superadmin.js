"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const email = process.env.SUPER_ADMIN_EMAIL || 'barkatdanish30@gmail.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@2024';
    const superAdminRole = await prisma.role.upsert({
        where: { name: 'SuperAdmin' },
        update: {},
        create: { name: 'SuperAdmin' },
    });
    console.log(`Role: ${superAdminRole.name} (${superAdminRole.id})`);
    await prisma.role.upsert({
        where: { name: 'Admin' },
        update: {},
        create: { name: 'Admin' },
    });
    await prisma.role.upsert({
        where: { name: 'Agent' },
        update: {},
        create: { name: 'Agent' },
    });
    const account = await prisma.account.upsert({
        where: { id: 'super-admin-account' },
        update: {},
        create: {
            id: 'super-admin-account',
            name: 'Voxiq Platform',
            status: client_1.AccountStatus.ACTIVE,
            approved: true,
            agentLimit: 999,
        },
    });
    console.log(`Account: ${account.name} (${account.id})`);
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const user = await prisma.user.upsert({
        where: { email: email.toLowerCase() },
        update: { roleId: superAdminRole.id },
        create: {
            name: 'Super Admin',
            email: email.toLowerCase(),
            passwordHash,
            roleId: superAdminRole.id,
            accountId: account.id,
        },
    });
    console.log(`Super admin: ${user.email}`);
    console.log('Done!');
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed-superadmin.js.map