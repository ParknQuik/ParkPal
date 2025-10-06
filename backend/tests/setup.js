const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Test user credentials
const TEST_USERS = {
  driver: {
    email: 'test-driver@example.com',
    password: 'testpass123',
    name: 'Test Driver',
    role: 'driver',
  },
  host: {
    email: 'test-host@example.com',
    password: 'testpass123',
    name: 'Test Host',
    role: 'host',
  },
  admin: {
    email: 'test-admin@example.com',
    password: 'testpass123',
    name: 'Test Admin',
    role: 'admin',
  },
};

async function cleanDatabase() {
  // Clean in order of dependencies
  await prisma.review.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.parkingSession.deleteMany();
  await prisma.sensorEvent.deleteMany();
  await prisma.parkingSlot.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.user.deleteMany();
}

async function createTestUsers() {
  const hashedPassword = await bcrypt.hash('testpass123', 10);

  const users = {};

  for (const [key, userData] of Object.entries(TEST_USERS)) {
    users[key] = await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword,
      },
    });
  }

  return users;
}

async function createTestZone() {
  return await prisma.zone.create({
    data: {
      name: 'Test Zone',
      type: 'commercial',
      address: 'Test Address',
      city: 'Test City',
      geofencePolygon: JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [120.9819, 14.5337],
            [120.9869, 14.5337],
            [120.9869, 14.5287],
            [120.9819, 14.5287],
            [120.9819, 14.5337],
          ],
        ],
      }),
      centerLat: 14.5312,
      centerLon: 120.9844,
      radiusMeters: 500,
      totalCapacity: 100,
      pricePerHour: 50,
    },
  });
}

async function createTestSlot(ownerId, zoneId, overrides = {}) {
  return await prisma.parkingSlot.create({
    data: {
      zoneId,
      slotNumber: 'TEST-001',
      lat: 14.5315,
      lon: 120.9845,
      address: 'Test Parking Slot Address',
      slotType: 'roadside_qr',
      status: 'available',
      price: 50,
      description: 'Test parking slot',
      amenities: JSON.stringify(['covered', 'security']),
      photos: JSON.stringify(['https://example.com/test.jpg']),
      rating: 0,
      ownerId,
      ...overrides,
    },
  });
}

async function setupTestDatabase() {
  await cleanDatabase();
  const users = await createTestUsers();
  const zone = await createTestZone();
  const slot = await createTestSlot(users.host.id, zone.id);

  return { users, zone, slot };
}

async function teardownTestDatabase() {
  await cleanDatabase();
  await prisma.$disconnect();
}

module.exports = {
  prisma,
  TEST_USERS,
  cleanDatabase,
  createTestUsers,
  createTestZone,
  createTestSlot,
  setupTestDatabase,
  teardownTestDatabase,
};
