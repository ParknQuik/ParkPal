const request = require('supertest');
const express = require('express');
const cors = require('cors');
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
let testBooking;

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

  // Create a test booking for payment tests
  const startTime = new Date(Date.now() + 3600000);
  const endTime = new Date(Date.now() + 7200000);

  testBooking = await prisma.booking.create({
    data: {
      slotId: testData.slot.id,
      userId: testData.users.driver.id,
      startTime,
      endTime,
      price: 50,
      platformFee: 2.5,
      hostEarnings: 47.5,
      status: 'pending',
    },
  });
});

afterAll(async () => {
  await teardownTestDatabase();
});

describe('Payment API Tests', () => {
  describe('POST /api/v1/payments', () => {
    it('should process a payment successfully', async () => {
      const response = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          bookingId: testBooking.id,
          paymentMethod: 'gcash',
          amount: 50,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(testData.users.driver.id);
      expect(response.body.bookingId).toBe(testBooking.id);
      expect(response.body.paymentMethod).toBe('gcash');
      expect(response.body.amount).toBe(50);
      expect(response.body.status).toBe('completed');
    });

    it('should update booking status to confirmed after payment', async () => {
      // Create a new booking for this test
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const newBooking = await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime,
          endTime,
          price: 50,
          platformFee: 2.5,
          hostEarnings: 47.5,
          status: 'pending',
        },
      });

      await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          bookingId: newBooking.id,
          paymentMethod: 'card',
          amount: 50,
        });

      const updatedBooking = await prisma.booking.findUnique({
        where: { id: newBooking.id },
      });

      expect(updatedBooking.status).toBe('confirmed');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/payments')
        .send({
          bookingId: testBooking.id,
          paymentMethod: 'card',
          amount: 50,
        });

      expect(response.status).toBe(401);
    });

    it('should fail when paying for another users booking', async () => {
      const response = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${authTokens.host}`)
        .send({
          bookingId: testBooking.id,
          paymentMethod: 'card',
          amount: 50,
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should fail for non-existent booking', async () => {
      const response = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          bookingId: 99999,
          paymentMethod: 'card',
          amount: 50,
        });

      expect(response.status).toBe(403);
    });

    it('should accept different payment methods', async () => {
      const paymentMethods = ['card', 'cash', 'gcash', 'paymaya', 'paymongo'];

      for (const method of paymentMethods) {
        const startTime = new Date(Date.now() + 3600000);
        const endTime = new Date(Date.now() + 7200000);

        const booking = await prisma.booking.create({
          data: {
            slotId: testData.slot.id,
            userId: testData.users.driver.id,
            startTime,
            endTime,
            price: 50,
            platformFee: 2.5,
            hostEarnings: 47.5,
            status: 'pending',
          },
        });

        const response = await request(app)
          .post('/api/v1/payments')
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            bookingId: booking.id,
            paymentMethod: method,
            amount: 50,
          });

        expect(response.status).toBe(201);
        expect(response.body.paymentMethod).toBe(method);
      }
    });
  });

  describe('GET /api/v1/payments', () => {
    beforeAll(async () => {
      // Create some payments for testing
      await prisma.payment.deleteMany({
        where: { userId: testData.users.driver.id },
      });

      for (let i = 0; i < 3; i++) {
        const startTime = new Date(Date.now() + 3600000 * (i + 1));
        const endTime = new Date(Date.now() + 7200000 * (i + 1));

        const booking = await prisma.booking.create({
          data: {
            slotId: testData.slot.id,
            userId: testData.users.driver.id,
            startTime,
            endTime,
            price: 50,
            platformFee: 2.5,
            hostEarnings: 47.5,
            status: 'pending',
          },
        });

        await prisma.payment.create({
          data: {
            userId: testData.users.driver.id,
            bookingId: booking.id,
            paymentMethod: 'card',
            amount: 50,
            status: 'completed',
          },
        });

        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });

    it('should return user payments', async () => {
      const response = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(3);
    });

    it('should include booking and slot information', async () => {
      const response = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('booking');
        expect(response.body[0].booking).toHaveProperty('slot');
      }
    });

    it('should order payments by creation date (newest first)', async () => {
      const response = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);

      for (let i = 1; i < response.body.length; i++) {
        const prev = new Date(response.body[i - 1].createdAt);
        const curr = new Date(response.body[i].createdAt);
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
      }
    });

    it('should only return payments for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      response.body.forEach((payment) => {
        expect(payment.userId).toBe(testData.users.driver.id);
      });
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/v1/payments');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/payments/:id', () => {
    let testPayment;

    beforeAll(async () => {
      const startTime = new Date(Date.now() + 3600000);
      const endTime = new Date(Date.now() + 7200000);

      const booking = await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime,
          endTime,
          price: 50,
          platformFee: 2.5,
          hostEarnings: 47.5,
          status: 'pending',
        },
      });

      testPayment = await prisma.payment.create({
        data: {
          userId: testData.users.driver.id,
          bookingId: booking.id,
          paymentMethod: 'card',
          amount: 50,
          status: 'completed',
        },
      });
    });

    it('should return a specific payment', async () => {
      const response = await request(app)
        .get(`/api/v1/payments/${testPayment.id}`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testPayment.id);
      expect(response.body.userId).toBe(testData.users.driver.id);
      expect(response.body).toHaveProperty('booking');
    });

    it('should include booking and slot information', async () => {
      const response = await request(app)
        .get(`/api/v1/payments/${testPayment.id}`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('booking');
      expect(response.body.booking).toHaveProperty('slot');
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get(`/api/v1/payments/${testPayment.id}`);

      expect(response.status).toBe(401);
    });

    it('should fail when accessing another users payment', async () => {
      const response = await request(app)
        .get(`/api/v1/payments/${testPayment.id}`)
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should fail for non-existent payment', async () => {
      const response = await request(app)
        .get('/api/v1/payments/99999')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Payment Authorization and Capture Tests', () => {
    let openModeBooking;
    let fixedModeBooking;

    beforeEach(async () => {
      // Create open mode booking for authorization tests
      openModeBooking = await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() + 60 * 60 * 1000),
          endTime: null, // Open mode has no end time
          rentalMode: 'open',
          maxDuration: 12,
          status: 'pending',
          price: 600, // 12 hours * 50
          authAmount: 600,
          platformFee: 30,
          hostEarnings: 570
        }
      });

      // Create fixed mode booking for comparison
      fixedModeBooking = await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() + 60 * 60 * 1000),
          endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
          rentalMode: 'fixed',
          status: 'pending',
          price: 150,
          platformFee: 7.5,
          hostEarnings: 142.5
        }
      });
    });

    describe('POST /api/v1/payments/intent - Authorization for Open Mode', () => {
      it('should create payment intent with manual capture for open mode', async () => {
        const response = await request(app)
          .post('/api/v1/payments/intent')
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            amount: openModeBooking.price,
            paymentMethod: 'card',
            bookingId: openModeBooking.id
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('paymentIntentId');
        expect(response.body.message).toContain('authorized');

        // Verify authId was stored in booking
        const updatedBooking = await prisma.booking.findUnique({
          where: { id: openModeBooking.id }
        });
        expect(updatedBooking.authId).toBeTruthy();
      });

      it('should create payment intent with automatic capture for fixed mode', async () => {
        const response = await request(app)
          .post('/api/v1/payments/intent')
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            amount: fixedModeBooking.price,
            paymentMethod: 'card',
            bookingId: fixedModeBooking.id
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('paymentIntentId');
        expect(response.body.message).not.toContain('authorized');

        // Fixed mode should not store authId
        const updatedBooking = await prisma.booking.findUnique({
          where: { id: fixedModeBooking.id }
        });
        expect(updatedBooking.authId).toBeNull();
      });
    });

    describe('POST /api/v1/payments/confirm - Confirm Authorization', () => {
      let paymentIntentId;

      beforeEach(async () => {
        // Create payment intent first
        const intentResponse = await request(app)
          .post('/api/v1/payments/intent')
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            amount: openModeBooking.price,
            paymentMethod: 'card',
            bookingId: openModeBooking.id
          });

        paymentIntentId = intentResponse.body.paymentIntentId;
      });

      it('should confirm authorization and update payment status to authorized', async () => {
        const response = await request(app)
          .post('/api/v1/payments/confirm')
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            paymentIntentId
          });

        expect(response.status).toBe(200);

        // Verify payment status is 'authorized' not 'completed'
        const payment = await prisma.payment.findFirst({
          where: {
            paymentIntent: paymentIntentId
          }
        });
        expect(payment.status).toBe('authorized');
      });
    });

    describe('QR Checkout with Payment Capture', () => {
      let session;
      let authPayment;

      beforeEach(async () => {
        // Clean up any existing payments with same transactionId
        await prisma.payment.deleteMany({
          where: { transactionId: 'test_auth_payment_intent_123' }
        });

        // Set booking to confirmed with authId
        await prisma.booking.update({
          where: { id: openModeBooking.id },
          data: {
            status: 'confirmed',
            authId: 'test_auth_payment_intent_123'
          }
        });

        // Create payment with authorized status
        authPayment = await prisma.payment.create({
          data: {
            userId: testData.users.driver.id,
            bookingId: openModeBooking.id,
            amount: openModeBooking.authAmount,
            paymentMethod: 'card',
            status: 'authorized',
            transactionId: 'test_auth_payment_intent_123'
          }
        });

        // Create parking session (check-in)
        session = await prisma.parkingSession.create({
          data: {
            userId: testData.users.driver.id,
            slotId: testData.slot.id,
            bookingId: openModeBooking.id,
            sessionType: 'roadside_qr',
            checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
            status: 'active'
          }
        });
      });

      it('should capture payment at checkout for open mode booking', async () => {
        const response = await request(app)
          .post('/api/v1/marketplace/qr/checkout')
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            sessionId: session.id
          });

        expect(response.status).toBe(200);

        // Verify session completed
        const completedSession = await prisma.parkingSession.findUnique({
          where: { id: session.id }
        });
        expect(completedSession.status).toBe('completed');
        expect(completedSession.totalAmount).toBeTruthy();
        expect(completedSession.durationMinutes).toBeTruthy();

        // Verify payment was updated to completed
        const completedPayment = await prisma.payment.findUnique({
          where: { id: authPayment.id }
        });
        expect(completedPayment.status).toBe('completed');
        expect(completedPayment.amount).toBeLessThanOrEqual(openModeBooking.authAmount);

        // Verify booking was completed
        const completedBooking = await prisma.booking.findUnique({
          where: { id: openModeBooking.id }
        });
        expect(completedBooking.status).toBe('completed');
        expect(completedBooking.endTime).toBeTruthy(); // endTime should now be set
      });

      it('should handle overstay scenario (actual > authorized)', async () => {
        // Update session to have been active for 15 hours (beyond 12 hour max)
        await prisma.parkingSession.update({
          where: { id: session.id },
          data: {
            checkInTime: new Date(Date.now() - 15 * 60 * 60 * 1000)
          }
        });

        const response = await request(app)
          .post('/api/v1/marketplace/qr/checkout')
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            sessionId: session.id
          });

        expect(response.status).toBe(200);

        // Verify overstay notification created
        const overstayNotification = await prisma.notification.findFirst({
          where: {
            userId: testData.users.driver.id,
            body: {
              contains: 'additional payment'
            }
          }
        });
        expect(overstayNotification).toBeTruthy();
      });

      it('should handle checkout when actual time < authorized amount', async () => {
        // Update session to only 1 hour (less than 12 hour auth)
        await prisma.parkingSession.update({
          where: { id: session.id },
          data: {
            checkInTime: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
          }
        });

        const response = await request(app)
          .post('/api/v1/marketplace/qr/checkout')
          .set('Authorization', `Bearer ${authTokens.driver}`)
          .send({
            sessionId: session.id
          });

        expect(response.status).toBe(200);

        // Verify only actual amount was captured
        const completedPayment = await prisma.payment.findUnique({
          where: { id: authPayment.id }
        });
        
        // 1 hour parking should be much less than 12 hour authorization
        expect(completedPayment.amount).toBeLessThan(openModeBooking.authAmount);
      });
    });
  });
});

describe('Cash Payment Tests', () => {
  let cashBooking;

  beforeEach(async () => {
    // Create pending booking for cash payment
    cashBooking = await prisma.booking.create({
      data: {
        slotId: testData.slot.id,
        userId: testData.users.driver.id,
        startTime: new Date(Date.now() + 60 * 60 * 1000),
        endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
        rentalMode: 'fixed',
        status: 'pending',
        price: 150,
        platformFee: 7.5,
        hostEarnings: 142.5
      }
    });
  });

  describe('POST /api/v1/payments/intent - Cash Payment', () => {
    it('should return cash payment intent without creating Stripe payment', async () => {
      const response = await request(app)
        .post('/api/v1/payments/intent')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          amount: cashBooking.price,
          paymentMethod: 'cash',
          bookingId: cashBooking.id
        });

      expect(response.status).toBe(200);
      expect(response.body.paymentIntentId).toMatch(/^cash_/);
      expect(response.body.message).toContain('Cash');
      expect(response.body.requiresPayment).toBe(false);
    });

    it('should require booking for cash payment intent', async () => {
      const response = await request(app)
        .post('/api/v1/payments/intent')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          amount: 100,
          paymentMethod: 'cash'
          // Missing bookingId
        });

      expect(response.status).toBe(400);
    });
  });

describe('POST /api/v1/payments/confirm - Cash Payment', () => {
    it('should confirm booking with cash payment', async () => {
       // First create the cash payment intent
       const intentResponse = await request(app)
         .post('/api/v1/payments/intent')
         .set('Authorization', `Bearer ${authTokens.driver}`)
         .send({
           amount: cashBooking.price,
           paymentMethod: 'cash',
           bookingId: cashBooking.id
         });

       const paymentIntentId = intentResponse.body.paymentIntentId;

       const response = await request(app)
         .post('/api/v1/payments/confirm')
         .set('Authorization', `Bearer ${authTokens.driver}`)
         .send({
           paymentIntentId
         });

       expect(response.status).toBe(200);
       expect(response.body.message).toContain('cash');

       // Verify payment created with pending status
       const payment = await prisma.payment.findFirst({
         where: { bookingId: cashBooking.id }
       });
       expect(payment).toBeTruthy();
       expect(payment.paymentMethod).toBe('cash');
       expect(payment.status).toBe('pending');

       // Verify booking confirmed
       const updatedBooking = await prisma.booking.findUnique({
         where: { id: cashBooking.id }
       });
       expect(updatedBooking.status).toBe('confirmed');
     });

    it('should fail to confirm with forged payment intent ID', async () => {
       // Attempt to forge a payment intent ID with predictable format
       const forgedPaymentIntentId = `cash_${cashBooking.id}_12345`;

       const response = await request(app)
         .post('/api/v1/payments/confirm')
         .set('Authorization', `Bearer ${authTokens.driver}`)
         .send({
           paymentIntentId: forgedPaymentIntentId
         });

       // Should fail because the forged token doesn't exist in database
       expect(response.status).toBe(404);
     });

    it('should create notification for host', async () => {
       // First create the cash payment intent
       const intentResponse = await request(app)
         .post('/api/v1/payments/intent')
         .set('Authorization', `Bearer ${authTokens.driver}`)
         .send({
           amount: cashBooking.price,
           paymentMethod: 'cash',
           bookingId: cashBooking.id
         });

       const paymentIntentId = intentResponse.body.paymentIntentId;

       await request(app)
         .post('/api/v1/payments/confirm')
         .set('Authorization', `Bearer ${authTokens.driver}`)
         .send({
           paymentIntentId
         });

       // Get the slot owner (host) to check for notification
       const bookingWithSlot = await prisma.booking.findUnique({
         where: { id: cashBooking.id },
         include: { slot: true }
       });

       if (bookingWithSlot.slot?.ownerId) {
         const notification = await prisma.notification.findFirst({
           where: {
             userId: bookingWithSlot.slot.ownerId,
             type: 'booking_confirmed'
           }
         });
         expect(notification).toBeTruthy();
         expect(notification.title).toContain('Cash');
       }
     });
  });

  describe('POST /api/v1/marketplace/bookings/:id/confirm', () => {
    it('should confirm booking directly without payment', async () => {
      // Create another pending booking
      const pendingBooking = await prisma.booking.create({
        data: {
          slotId: testData.slot.id,
          userId: testData.users.driver.id,
          startTime: new Date(Date.now() + 60 * 60 * 1000),
          endTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
          rentalMode: 'fixed',
          status: 'pending',
          price: 100,
          platformFee: 5,
          hostEarnings: 95
        }
      });

      const response = await request(app)
        .post(`/api/v1/marketplace/bookings/${pendingBooking.id}/confirm`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('confirmed');
      expect(response.body.booking.status).toBe('confirmed');

      // Verify slot status updated
      const slot = await prisma.parkingSlot.findUnique({
        where: { id: testData.slot.id }
      });
      expect(slot.status).toBe('reserved');
    });

    it('should not confirm already confirmed booking', async () => {
      await prisma.booking.update({
        where: { id: cashBooking.id },
        data: { status: 'confirmed' }
      });

      const response = await request(app)
        .post(`/api/v1/marketplace/bookings/${cashBooking.id}/confirm`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('pending');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/marketplace/bookings/${cashBooking.id}/confirm`);

      expect(response.status).toBe(401);
    });

    it('should verify ownership', async () => {
      const response = await request(app)
        .post(`/api/v1/marketplace/bookings/${cashBooking.id}/confirm`)
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(response.status).toBe(403);
    });
  });
});
