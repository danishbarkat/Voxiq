import { PrismaClient, AccountStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
      status: AccountStatus.ACTIVE,
      approved: true,
      agentLimit: 999,
    },
  });
  console.log(`Account: ${account.name} (${account.id})`);

  const passwordHash = await bcrypt.hash(password, 10);
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
