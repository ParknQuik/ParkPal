const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.user.count();
    console.log('User count:', count);
    const user = await prisma.user.findUnique({
      where: { email: 'juan@example.com' }
    });
    console.log('User found:', user ? user.id : 'not found');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();