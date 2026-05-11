const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const requester = await prisma.user.findFirst({
    where: { email: 'barkatdanish44@gmail.com' },
    include: { role: true }
  });

  console.log('Requester Data:', {
    email: requester.email,
    role: requester.role?.name,
    accountId: requester.accountId
  });

  const where = {};
  if (requester.role?.name?.toLowerCase() !== 'superadmin' && requester.accountId) {
    where.accountId = requester.accountId;
  }

  console.log('Prisma Where Clause:', JSON.stringify(where, null, 2));

  const users = await prisma.user.findMany({
    where,
    include: { role: true, account: true }
  });

  console.log('Results Found:', users.length);
  console.table(users.map(u => ({
    email: u.email,
    role: u.role?.name,
    account: u.account?.name,
    accountId: u.accountId
  })));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
