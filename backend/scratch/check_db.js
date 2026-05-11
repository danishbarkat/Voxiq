const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { 
      OR: [
        { email: { contains: 'danish' } },
        { email: { contains: 'barkat' } }
      ]
    },
    include: { role: true, account: true }
  });
  
  const mapping = users.map(u => ({
    email: u.email,
    role: u.role?.name,
    account: u.account?.name,
    accountId: u.accountId
  }));

  console.log('Filtered User-Account Mapping:');
  console.table(mapping);
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
