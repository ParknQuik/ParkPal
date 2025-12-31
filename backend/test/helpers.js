/**
 * Test Helper Functions
 * Utilities for database cleanup and test data management
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Clean database using transaction rollback
 * This is faster and safer than deleting records
 */
async function cleanDatabase() {
  const tables = [
    'Review',
    'Payout',
    'Payment',
    'ParkingSession',
    'Booking',
    'ParkingSlot',
    'Zone',
    'User',
    'SensorEvent',
    'ActivityEvent',
    'ZoneMetrics',
  ];

  // Use transaction to ensure atomicity
  await prisma.$transaction(
    tables.map((table) =>
      prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`)
    )
  );
}

/**
 * Close database connection
 */
async function closeDatabase() {
  await prisma.$disconnect();
}

/**
 * Create test user
 */
async function createTestUser(overrides = {}) {
  const bcrypt = require('bcrypt');
  const password = await bcrypt.hash('TestPassword123!', 10);

  return prisma.user.create({
    data: {
      email: overrides.email || `test${Date.now()}@example.com`,
      password,
      name: overrides.name || 'Test User',
      role: overrides.role || 'driver',
      ...overrides,
    },
  });
}

/**
 * Create test zone
 */
async function createTestZone(overrides = {}) {
  return prisma.zone.create({
    data: {
      name: overrides.name || 'Test Zone',
      polygon: overrides.polygon || JSON.stringify({
        type: 'Polygon',
        coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]],
      }),
      ...overrides,
    },
  });
}

/**
 * Create test parking slot
 */
async function createTestParkingSlot(zoneId, hostId, overrides = {}) {
  return prisma.parkingSlot.create({
    data: {
      zoneId,
      hostId,
      address: overrides.address || '123 Test St',
      latitude: overrides.latitude || 14.5995,
      longitude: overrides.longitude || 120.9842,
      pricePerHour: overrides.pricePerHour || 50,
      isAvailable: overrides.isAvailable !== undefined ? overrides.isAvailable : true,
      ...overrides,
    },
  });
}

/**
 * Generate test JWT token
 */
function generateTestToken(userId, role = 'driver') {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

module.exports = {
  cleanDatabase,
  closeDatabase,
  createTestUser,
  createTestZone,
  createTestParkingSlot,
  generateTestToken,
  prisma,
};
