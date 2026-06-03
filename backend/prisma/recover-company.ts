import { PrismaClient, AccountStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Restore Bytechsol LLC with the number already in Telnyx
  const adminRole = await prisma.role.findFirst({ where: { name: { equals: 'Admin', mode: 'insensitive' } } });
  const agentRole = await prisma.role.findFirst({ where: { name: { equals: 'Agent', mode: 'insensitive' } } });

  if (!adminRole || !agentRole) throw new Error('Roles not found');

  const account = await prisma.account.create({
    data: {
      name: 'Bytechsol LLC',
      status: AccountStatus.ACTIVE,
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
  const adminHash = await bcrypt.hash(tempAdminPass, 10);
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

  // Recreate talha as agent
  const tempAgentPass = 'TalhaAgent@123';
  const agentHash = await bcrypt.hash(tempAgentPass, 10);
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
