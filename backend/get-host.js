const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const host = await prisma.users.findUnique({
    where: { id: 86 },
    select: { id: true, email: true, name: true, role: true }
  });

  console.log('\n=== HOST ACCOUNT (ID 86) ===');
  console.log('Name:', host.name);
  console.log('Email:', host.email);
  console.log('Password: password123');
  console.log('Role:', host.role);

  const listings = await prisma.parkingSlots.findMany({
    where: { ownerId: 86 },
    select: { id: true, description: true, address: true, slotType: true }
  });

  console.log('\n=== LISTINGS (' + listings.length + ' total) ===');
  const elevated = listings.find(l => l.description && l.description.includes('Elevated'));
  if (elevated) {
    console.log('\n🎯 ELEVATED COVERED PARKING:');
    console.log('Listing ID:', elevated.id);
    console.log('Description:', elevated.description);
    console.log('Address:', elevated.address);
    console.log('Type:', elevated.slotType);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
