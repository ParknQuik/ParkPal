const request = require('supertest');
const express = require('express');
const cors = require('cors');
const {
  setupTestDatabase,
  teardownTestDatabase,
  prisma,
} = require('./setup');

const app = express();
app.use(cors());
app.use(express.json());

const rateLimit = require('express-rate-limit');
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

const v1Router = require('../routes/v1');
app.use('/api/v1', v1Router(authLimiter));

let testData = {};
let authTokens = {};

beforeAll(async () => {
  testData = await setupTestDatabase();

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

  await prisma.notification.deleteMany();
});

afterAll(async () => {
  await prisma.notification.deleteMany();
  await teardownTestDatabase();
});

async function createNotification(overrides = {}) {
  return prisma.notification.create({
    data: {
      userId: testData.users.driver.id,
      title: 'Test Notification',
      body: 'This is a test notification',
      type: 'general',
      read: false,
      ...overrides,
    },
  });
}

describe('Notifications API', () => {
  describe('GET /api/v1/notifications', () => {
    beforeEach(async () => {
      await prisma.notification.deleteMany();
    });

    it('should return empty notifications when none exist', async () => {
      const response = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.notifications).toEqual([]);
      expect(response.body.total).toBe(0);
      expect(response.body.unreadCount).toBe(0);
    });

    it('should return user notifications', async () => {
      await createNotification({ title: 'First' });
      await createNotification({ title: 'Second', read: true });

      const response = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.notifications.length).toBe(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter by read status', async () => {
      await createNotification({ title: 'Unread', read: false });
      await createNotification({ title: 'Read', read: true });

      const unreadResponse = await request(app)
        .get('/api/v1/notifications?read=false')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(unreadResponse.status).toBe(200);
      expect(unreadResponse.body.notifications.length).toBe(1);
      expect(unreadResponse.body.notifications[0].title).toBe('Unread');

      const readResponse = await request(app)
        .get('/api/v1/notifications?read=true')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(readResponse.status).toBe(200);
      expect(readResponse.body.notifications.length).toBe(1);
      expect(readResponse.body.notifications[0].title).toBe('Read');
    });

    it('should support pagination', async () => {
      for (let i = 0; i < 5; i++) {
        await createNotification({ title: `Notification ${i}` });
      }

      const response = await request(app)
        .get('/api/v1/notifications?limit=2&offset=0')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.notifications.length).toBe(2);
      expect(response.body.total).toBe(5);
    });

    it('should not return notifications belonging to other users', async () => {
      await createNotification({ title: 'Driver Notification' });
      await createNotification({
        userId: testData.users.host.id,
        title: 'Host Notification',
      });

      const response = await request(app)
        .get('/api/v1/notifications')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.notifications.length).toBe(1);
      expect(response.body.notifications[0].title).toBe('Driver Notification');
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    beforeEach(async () => {
      await prisma.notification.deleteMany();
    });

    it('should return zero when no unread notifications', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.unreadCount).toBe(0);
    });

    it('should return correct unread count', async () => {
      await createNotification({ read: false });
      await createNotification({ read: false });
      await createNotification({ read: true });

      const response = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.unreadCount).toBe(2);
    });
  });

  describe('GET /api/v1/notifications/:id', () => {
    let notificationId;

    beforeEach(async () => {
      await prisma.notification.deleteMany();
      const notification = await createNotification();
      notificationId = notification.id;
    });

    it('should return a single notification', async () => {
      const response = await request(app)
        .get(`/api/v1/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(notificationId);
      expect(response.body.title).toBe('Test Notification');
    });

    it('should return 404 for non-existent notification', async () => {
      const response = await request(app)
        .get('/api/v1/notifications/999999')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for notification belonging to another user', async () => {
      const otherNotification = await createNotification({
        userId: testData.users.host.id,
        title: 'Not Mine',
      });

      const response = await request(app)
        .get(`/api/v1/notifications/${otherNotification.id}`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/notifications/:id/read', () => {
    let notificationId;

    beforeEach(async () => {
      await prisma.notification.deleteMany();
      const notification = await createNotification({ read: false });
      notificationId = notification.id;
    });

    it('should mark a notification as read', async () => {
      const response = await request(app)
        .patch(`/api/v1/notifications/${notificationId}/read`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.read).toBe(true);
      expect(response.body.id).toBe(notificationId);
    });

    it('should return 404 for non-existent notification', async () => {
      const response = await request(app)
        .patch('/api/v1/notifications/999999/read')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for notification belonging to another user', async () => {
      const otherNotification = await createNotification({
        userId: testData.users.host.id,
        read: false,
      });

      const response = await request(app)
        .patch(`/api/v1/notifications/${otherNotification.id}/read`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/notifications/read-all', () => {
    beforeEach(async () => {
      await prisma.notification.deleteMany();
    });

    it('should mark all notifications as read', async () => {
      await createNotification({ title: 'Unread 1', read: false });
      await createNotification({ title: 'Unread 2', read: false });
      await createNotification({ title: 'Already Read', read: true });

      const response = await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      const unreadResponse = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(unreadResponse.body.unreadCount).toBe(0);
    });

    it('should only affect current user notifications', async () => {
      await createNotification({ userId: testData.users.driver.id, read: false });
      await createNotification({ userId: testData.users.host.id, read: false });

      await request(app)
        .patch('/api/v1/notifications/read-all')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      const driverUnread = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(driverUnread.body.unreadCount).toBe(0);

      const hostUnread = await request(app)
        .get('/api/v1/notifications/unread-count')
        .set('Authorization', `Bearer ${authTokens.host}`);

      expect(hostUnread.body.unreadCount).toBe(1);
    });
  });

  describe('DELETE /api/v1/notifications/:id', () => {
    let notificationId;

    beforeEach(async () => {
      await prisma.notification.deleteMany();
      const notification = await createNotification();
      notificationId = notification.id;
    });

    it('should delete a notification', async () => {
      const response = await request(app)
        .delete(`/api/v1/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      const check = await request(app)
        .get(`/api/v1/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(check.status).toBe(404);
    });

    it('should return 404 for non-existent notification', async () => {
      const response = await request(app)
        .delete('/api/v1/notifications/999999')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for notification belonging to another user', async () => {
      const otherNotification = await createNotification({
        userId: testData.users.host.id,
      });

      const response = await request(app)
        .delete(`/api/v1/notifications/${otherNotification.id}`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(404);
    });
  });
});
