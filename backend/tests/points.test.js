const request = require('supertest');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const {
  setupTestDatabase,
  teardownTestDatabase,
  prisma,
} = require('./setup');

// Create test app
const app = express();
app.use(cors());
app.use(express.json());

// Create a mock rate limiter for tests
const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

// Import v1 router
const v1Router = require('../routes/v1');
app.use('/api/v1', v1Router(authLimiter));

let testData = {};
let authTokens = {};

beforeAll(async () => {
  testData = await setupTestDatabase();

  // Login test users to get tokens
  const driverLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'test-driver@example.com',
      password: 'testpass123',
    });
  authTokens.driver = driverLogin.body.token;

  const hostLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'test-host@example.com',
      password: 'testpass123',
    });
  authTokens.host = hostLogin.body.token;
});

afterAll(async () => {
  await teardownTestDatabase();
});

describe('Points Balance API Tests', () => {
   it('should return zero balance for user with no transactions', async () => {
     const hashedPassword = await bcrypt.hash('testpass123', 10);
     // Create a fresh user with no points transactions
     const newUser = await prisma.user.create({
       data: {
         email: 'nopoints@example.com',
         password: hashedPassword,
         name: 'No Points User',
         role: 'driver',
       },
     });

     const login = await request(app)
       .post('/api/v1/auth/login')
       .send({
         email: 'nopoints@example.com',
         password: 'testpass123',
       });

     const response = await request(app)
       .get('/api/v1/points/balance')
       .set('Authorization', `Bearer ${login.body.token}`);

     expect(response.status).toBe(200);
     expect(response.body).toHaveProperty('balance');
     expect(response.body.balance).toBe(0);
   });

  it('should return correct balance for user with positive balance', async () => {
    // Create a dedicated test user for this test
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    const balanceTestUser = await prisma.user.create({
      data: {
        email: `balance-test-${Date.now()}@example.com`,
        password: hashedPassword,
        name: 'Balance Test User',
        role: 'driver',
      },
    });

    // Create points transaction for this user
    await prisma.pointsTransaction.create({
      data: {
        userId: balanceTestUser.id,
        amount: 100,
        balanceAfter: 100,
        type: 'EARNED',
        source: 'BOOKING',
        referenceId: 1,
        referenceType: 'BOOKING',
        description: 'Test points',
      },
    });

    // Create another transaction
    await prisma.pointsTransaction.create({
      data: {
        userId: balanceTestUser.id,
        amount: 50,
        balanceAfter: 150,
        type: 'EARNED',
        source: 'REFERRAL_FIRST_BOOKING',
        description: 'Referral bonus',
      },
    });

    // Login as this user
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: balanceTestUser.email,
        password: 'testpass123',
      });

    const response = await request(app)
      .get('/api/v1/points/balance')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('balance');
    expect(response.body.balance).toBe(150);
  });

  it('should calculate balance only from non-expired transactions', async () => {
    // Create a dedicated test user for this test
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    const balanceTestUser = await prisma.user.create({
      data: {
        email: `balance-expiry-test-${Date.now()}@example.com`,
        password: hashedPassword,
        name: 'Balance Expiry Test User',
        role: 'driver',
      },
    });

    // Login as this user
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: balanceTestUser.email,
        password: 'testpass123',
      });

    // Create both active and expired transactions
    await prisma.pointsTransaction.create({
      data: {
        userId: balanceTestUser.id,
        amount: 100,
        balanceAfter: 100,
        type: 'EARNED',
        isExpired: false,
      },
    });

    await prisma.pointsTransaction.create({
      data: {
        userId: balanceTestUser.id,
        amount: 50,
        balanceAfter: 50,
        type: 'EARNED',
        isExpired: true, // This should not count
      },
    });

    const response = await request(app)
      .get('/api/v1/points/balance')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(response.status).toBe(200);
    expect(response.body.balance).toBe(100);
  });

  it('should require authentication', async () => {
    const response = await request(app).get('/api/v1/points/balance');

    expect(response.status).toBe(401);
  });

  afterAll(async () => {
    // Clean up points transactions for driver to prevent test pollution
    await prisma.pointsTransaction.deleteMany({
      where: { userId: testData.users.driver.id },
    });
  });
});

describe('Earn Points API Tests', () => {
  let completedBooking;
  let pendingBooking;
  let otherUserBooking;

  beforeAll(async () => {
    // Create test bookings for the driver user
    const startTime = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const endTime = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    completedBooking = await prisma.booking.create({
      data: {
        slotId: testData.slot.id,
        userId: testData.users.driver.id,
        startTime,
        endTime,
        price: 500,
        platformFee: 25,
        hostEarnings: 475,
        status: 'completed',
      },
    });

    pendingBooking = await prisma.booking.create({
      data: {
        slotId: testData.slot.id,
        userId: testData.users.driver.id,
        startTime: new Date(Date.now() + 3600000),
        endTime: new Date(Date.now() + 7200000),
        price: 50,
        platformFee: 2.5,
        hostEarnings: 47.5,
        status: 'pending',
      },
    });

    // Create booking for another user (host)
    otherUserBooking = await prisma.booking.create({
      data: {
        slotId: testData.slot.id,
        userId: testData.users.host.id,
        startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        price: 500,
        platformFee: 25,
        hostEarnings: 475,
        status: 'completed',
      },
    });
  });

  it('should earn points for valid completed booking', async () => {
    const response = await request(app)
      .post('/api/v1/points/earn')
      .set('Authorization', `Bearer ${authTokens.driver}`)
      .send({
        bookingId: completedBooking.id,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('transaction');
    expect(response.body.transaction.amount).toBe(100);
    expect(response.body.transaction.type).toBe('EARNED');
    expect(response.body.transaction.source).toBe('BOOKING');
    expect(response.body).toHaveProperty('newBalance');
    expect(response.body.newBalance).toBe(100);
  });

  it('should allow custom amount for earning points', async () => {
    // Create a separate completed booking for this test
    const customBooking = await prisma.booking.create({
      data: {
        slotId: testData.slot.id,
        userId: testData.users.driver.id,
        startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        price: 500,
        platformFee: 25,
        hostEarnings: 475,
        status: 'completed',
      },
    });

    const response = await request(app)
      .post('/api/v1/points/earn')
      .set('Authorization', `Bearer ${authTokens.driver}`)
      .send({
        bookingId: customBooking.id,
        amount: 200,
      });

    expect(response.status).toBe(201);
    expect(response.body.transaction.amount).toBe(200);
  });

  it('should fail when booking does not belong to user', async () => {
    const response = await request(app)
      .post('/api/v1/points/earn')
      .set('Authorization', `Bearer ${authTokens.driver}`)
      .send({
        bookingId: otherUserBooking.id,
      });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Booking not found');
  });

  it('should fail when booking is not completed', async () => {
    const response = await request(app)
      .post('/api/v1/points/earn')
      .set('Authorization', `Bearer ${authTokens.driver}`)
      .send({
        bookingId: pendingBooking.id,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Booking must be completed to earn points');
  });

  it('should fail when points already earned for booking', async () => {
    // First earn
    await request(app)
      .post('/api/v1/points/earn')
      .set('Authorization', `Bearer ${authTokens.driver}`)
      .send({
        bookingId: completedBooking.id,
      });

    // Second earn attempt
    const response = await request(app)
      .post('/api/v1/points/earn')
      .set('Authorization', `Bearer ${authTokens.driver}`)
      .send({
        bookingId: completedBooking.id,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Points already earned for this booking');
  });

  it('should fail for non-existent booking', async () => {
    const response = await request(app)
      .post('/api/v1/points/earn')
      .set('Authorization', `Bearer ${authTokens.driver}`)
      .send({
        bookingId: 99999,
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Booking not found');
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/v1/points/earn')
      .send({
        bookingId: completedBooking.id,
      });

    expect(response.status).toBe(401);
  });

  it('should validate request body with invalid bookingId', async () => {
    const response = await request(app)
      .post('/api/v1/points/earn')
      .set('Authorization', `Bearer ${authTokens.driver}`)
      .send({
        bookingId: 'invalid',
      });

    expect(response.status).toBe(400);
  });
});

  describe('Redeem Points API Tests', () => {
    beforeAll(async () => {
      // Clean up any existing points transactions for driver
      await prisma.pointsTransaction.deleteMany({
        where: { userId: testData.users.driver.id },
      });

      // Give driver user some points
      await prisma.pointsTransaction.create({
        data: {
          userId: testData.users.driver.id,
          amount: 500,
          balanceAfter: 500,
          type: 'EARNED',
          source: 'BOOKING',
          description: 'Initial points',
        },
      });
    });

  it('should redeem points with sufficient balance', async () => {
    const response = await request(app)
      .post('/api/v1/points/redeem')
      .set('Authorization', `Bearer ${authTokens.driver}`)
      .send({
        amount: 100,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('transaction');
    expect(response.body.transaction.amount).toBe(-100);
    expect(response.body.transaction.type).toBe('SPENT');
    expect(response.body.transaction.source).toBe('REDEMPTION');
    expect(response.body).toHaveProperty('newBalance');
    expect(response.body.newBalance).toBe(400);
    expect(response.body.discountAmount).toBe(100);
  });

  it('should redeem points for a specific booking', async () => {
    // Create a booking for redemption reference
    const booking = await prisma.booking.create({
      data: {
        slotId: testData.slot.id,
        userId: testData.users.driver.id,
        startTime: new Date(Date.now() + 3600000),
        endTime: new Date(Date.now() + 7200000),
        price: 50,
        platformFee: 2.5,
        hostEarnings: 47.5,
        status: 'pending',
      },
    });

    const response = await request(app)
      .post('/api/v1/points/redeem')
      .set('Authorization', `Bearer ${authTokens.driver}`)
      .send({
        amount: 50,
        bookingId: booking.id,
      });

    expect(response.status).toBe(201);
    expect(response.body.transaction.referenceId).toBe(booking.id);
    expect(response.body.transaction.referenceType).toBe('BOOKING');
  });

  it('should fail with insufficient points', async () => {
    const response = await request(app)
      .post('/api/v1/points/redeem')
      .set('Authorization', `Bearer ${authTokens.driver}`)
      .send({
        amount: 10000, // More than available
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Insufficient points balance');
  });

  it('should fail with zero amount', async () => {
    const response = await request(app)
      .post('/api/v1/points/redeem')
      .set('Authorization', `Bearer ${authTokens.driver}`)
      .send({
        amount: 0,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Valid amount is required');
  });

  it('should fail with negative amount', async () => {
    const response = await request(app)
      .post('/api/v1/points/redeem')
      .set('Authorization', `Bearer ${authTokens.driver}`)
      .send({
        amount: -50,
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Valid amount is required');
  });

  it('should fail with invalid amount type', async () => {
    const response = await request(app)
      .post('/api/v1/points/redeem')
      .set('Authorization', `Bearer ${authTokens.driver}`)
      .send({
        amount: 'invalid',
      });

    expect(response.status).toBe(400);
  });

  it('should require authentication', async () => {
    const response = await request(app)
      .post('/api/v1/points/redeem')
      .send({
        amount: 100,
      });

     expect(response.status).toBe(401);
  });

  afterAll(async () => {
    // Clean up points transactions to prevent test pollution
    await prisma.pointsTransaction.deleteMany({
      where: { userId: testData.users.driver.id },
    });
  });
});

describe('Referral System Tests', () => {
  describe('POST /api/v1/referrals/generate', () => {
    it('should generate a unique referral code', async () => {
      // First clean up any existing referrals for driver
      await prisma.referral.deleteMany({
        where: { referrerId: testData.users.driver.id },
      });

      const response = await request(app)
        .post('/api/v1/referrals/generate')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      if (response.status !== 201) {
        console.log('Error response:', response.body, response.status);
      }

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('referralCode');
      expect(response.body.referralCode).toMatch(/^REF\d+[A-F0-9]{6}$/);
    });

    it('should return existing referral code if already generated', async () => {
      // Clean up any existing referrals for driver first
      await prisma.referral.deleteMany({
        where: { referrerId: testData.users.driver.id },
      });

      // First generation
      const firstResponse = await request(app)
        .post('/api/v1/referrals/generate')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(firstResponse.status).toBe(201);

      // Second generation should return same code
      const secondResponse = await request(app)
        .post('/api/v1/referrals/generate')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.referralCode).toBe(firstResponse.body.referralCode);
    });

    afterEach(async () => {
      // Clean up referrals for driver after each test to prevent test pollution
      await prisma.referral.deleteMany({
        where: { referrerId: testData.users.driver.id },
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/referrals/generate');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/referrals/validate', () => {
    let validReferralCode;
    let expiredReferralCode;
    let selfReferralCode;
    let alreadyReferredUser;
    let hashedPassword;

    beforeAll(async () => {
      hashedPassword = await bcrypt.hash('testpass123', 10);

      // Create unique user for already referred test
      alreadyReferredUser = await prisma.user.create({
        data: {
          email: 'already-referred-test@example.com',
          password: hashedPassword,
          name: 'Already Referred Test User',
          role: 'driver',
        },
      });

      // Create unique user for expired referral test
      const expiredReferralUser = await prisma.user.create({
        data: {
          email: 'expired-referral-test@example.com',
          password: hashedPassword,
          name: 'Expired Referral Test User',
          role: 'driver',
        },
      });

      // Generate referral code for driver (valid referral code)
      const referralResponse = await request(app)
        .post('/api/v1/referrals/generate')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      validReferralCode = referralResponse.body.referralCode;
      // Self-referral test uses the driver's own referral code
      selfReferralCode = validReferralCode;

      // Create an expired referral
      const expiredReferral = await prisma.referral.create({
        data: {
          referrerId: testData.users.driver.id,
          referredId: expiredReferralUser.id,
          referralCode: 'EXPIRED12345',
          status: 'active',
          expiresAt: new Date(Date.now() - 86400000), // 1 day ago
        },
      });
      expiredReferralCode = expiredReferral.referralCode;
    });

    it('should validate a valid referral code', async () => {
      const response = await request(app)
        .post('/api/v1/referrals/validate')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          referralCode: validReferralCode,
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
      expect(response.body).toHaveProperty('referrerName');
      expect(response.body).toHaveProperty('rewardAmount');
      expect(response.body.rewardAmount).toBe(50);
    });

    it('should fail with invalid referral code', async () => {
      const response = await request(app)
        .post('/api/v1/referrals/validate')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          referralCode: 'INVALIDCODE',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Invalid referral code');
    });

    it('should fail with expired referral code', async () => {
      const response = await request(app)
        .post('/api/v1/referrals/validate')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          referralCode: expiredReferralCode,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Referral code has expired');
    });

    it('should prevent self-referral', async () => {
      const response = await request(app)
        .post('/api/v1/referrals/validate')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          referralCode: selfReferralCode,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot use own referral code');
    });

    it('should fail if user already referred', async () => {
      // Create a referral with alreadyReferredUser as already referred
      await prisma.referral.create({
        data: {
          referrerId: testData.users.driver.id,
          referredId: alreadyReferredUser.id,
          referralCode: 'ALREADYREFERRED',
          status: 'active',
        },
      });

      // Login as alreadyReferredUser to test validation
      const userLogin = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'already-referred-test@example.com',
          password: 'testpass123',
        });

      // Try to validate - should fail because alreadyReferredUser is already referred
      const response = await request(app)
        .post('/api/v1/referrals/validate')
        .set('Authorization', `Bearer ${userLogin.body.token}`)
        .send({
          referralCode: validReferralCode,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('User already referred');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/referrals/validate')
        .send({
          referralCode: validReferralCode,
        });

      expect(response.status).toBe(401);
    });

    it('should fail with missing referral code', async () => {
      const response = await request(app)
        .post('/api/v1/referrals/validate')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/v1/referrals/stats', () => {
    let statsTestUser1;
    let statsTestUser2;

    beforeAll(async () => {
      const hashedPassword = await bcrypt.hash('testpass123', 10);
      // Create unique users for stats test
      statsTestUser1 = await prisma.user.create({
        data: {
          email: 'stats-test-user1@example.com',
          password: hashedPassword,
          name: 'Stats Test User 1',
          role: 'driver',
        },
      });

      statsTestUser2 = await prisma.user.create({
        data: {
          email: 'stats-test-user2@example.com',
          password: hashedPassword,
          name: 'Stats Test User 2',
          role: 'driver',
        },
      });

      // Create some referrals for driver user
      await prisma.referral.create({
        data: {
          referrerId: testData.users.driver.id,
          referredId: statsTestUser1.id,
          referralCode: 'STATSTEST001',
          status: 'rewarded',
          rewardAmount: 100,
        },
      });

      await prisma.referral.create({
        data: {
          referrerId: testData.users.driver.id,
          referredId: statsTestUser2.id,
          referralCode: 'STATSTEST002',
          status: 'pending',
        },
      });
    });

    it('should return referral statistics', async () => {
      const response = await request(app)
        .get('/api/v1/referrals/stats')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalReferrals');
      expect(response.body).toHaveProperty('pendingReferrals');
      expect(response.body).toHaveProperty('activeReferrals');
      expect(response.body).toHaveProperty('completedReferrals');
      expect(response.body).toHaveProperty('totalPointsEarned');
      expect(response.body.totalReferrals).toBeGreaterThanOrEqual(1);
      expect(response.body.pendingReferrals).toBeGreaterThanOrEqual(1);
      expect(response.body.totalPointsEarned).toBe(100);
    });

    it('should return zero stats for user with no referrals', async () => {
      const response = await request(app)
        .get('/api/v1/referrals/stats')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(200);
      expect(response.body.totalReferrals).toBe(0);
      expect(response.body.pendingReferrals).toBe(0);
      expect(response.body.totalPointsEarned).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/v1/referrals/stats');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/referrals/process', () => {
    let alreadyRewardedReferral;
    let processTestUser;
    let processTestUser2;
    let processTestUser3;

    beforeAll(async () => {
      const hashedPassword = await bcrypt.hash('testpass123', 10);
      // Create unique users for process test
      processTestUser = await prisma.user.create({
        data: {
          email: 'process-test-user@example.com',
          password: hashedPassword,
          name: 'Process Test User',
          role: 'driver',
        },
      });

      processTestUser2 = await prisma.user.create({
        data: {
          email: 'process-test-user2@example.com',
          password: hashedPassword,
          name: 'Process Test User 2',
          role: 'driver',
        },
      });

      processTestUser3 = await prisma.user.create({
        data: {
          email: 'process-test-user3@example.com',
          password: hashedPassword,
          name: 'Process Test User 3',
          role: 'driver',
        },
      });

      // Create already rewarded referral
      alreadyRewardedReferral = await prisma.referral.create({
        data: {
          referrerId: testData.users.driver.id,
          referredId: processTestUser2.id,
          referralCode: 'REWARDEDTEST',
          status: 'rewarded',
          rewardAmount: 100,
          rewardGivenAt: new Date(),
        },
      });
    });

    it('should process referral reward for completed first booking', async () => {
      // Create a valid active referral
      const validReferral = await prisma.referral.create({
        data: {
          referrerId: testData.users.driver.id,
          referredId: processTestUser.id,
          referralCode: 'PROCESSTEST',
          status: 'active',
        },
      });

      const response = await request(app)
        .post('/api/v1/referrals/process')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          referredUserId: processTestUser.id,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.rewardAmount).toBe(100);

      // Verify referral status updated
      const updatedReferral = await prisma.referral.findUnique({
        where: { id: validReferral.id },
      });
      expect(updatedReferral.status).toBe('rewarded');
      expect(updatedReferral.rewardAmount).toBe(100);
      expect(updatedReferral.rewardGivenAt).toBeTruthy();
    });

    it('should create points transaction for referrer', async () => {
      // Create another valid active referral with a different user
      await prisma.referral.create({
        data: {
          referrerId: testData.users.driver.id,
          referredId: processTestUser3.id,
          referralCode: 'PROCESSTEST2',
          status: 'active',
        },
      });

      const response = await request(app)
        .post('/api/v1/referrals/process')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          referredUserId: processTestUser3.id,
        });

      expect(response.status).toBe(200);

      // Verify points transaction created
      const transaction = await prisma.pointsTransaction.findFirst({
        where: {
          userId: testData.users.driver.id,
          type: 'REFERRAL_REWARD',
        },
      });

      expect(transaction).toBeTruthy();
      expect(transaction.amount).toBe(100);
    });

    it('should fail when active referral not found', async () => {
      const response = await request(app)
        .post('/api/v1/referrals/process')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          referredUserId: 99999, // non-existent user
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Active referral not found for user');
    });

    it('should handle already rewarded referral gracefully', async () => {
      // First, process the referral to mark it as rewarded
      await prisma.referral.update({
        where: { id: alreadyRewardedReferral.id },
        data: { status: 'active' },
      });

      // Process it once
      await request(app)
        .post('/api/v1/referrals/process')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          referredUserId: processTestUser2.id,
        });

      // Try to process again - should fail because status is now 'rewarded' not 'active'
      const response = await request(app)
        .post('/api/v1/referrals/process')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          referredUserId: processTestUser2.id,
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Active referral not found for user');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/referrals/process')
        .send({
          referredUserId: processTestUser.id,
        });

      expect(response.status).toBe(401);
    });

    it('should fail with missing required field', async () => {
      const response = await request(app)
        .post('/api/v1/referrals/process')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });
});
