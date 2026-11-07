const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  try {
    console.log('Attempting count...');
    const count = await prisma.user.count();
    console.log('User count:', count);
  } catch (error) {
    console.error('Error message:', error.message);
    console.error('Error meta:', error.meta);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();