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

  await prisma.vehicle.deleteMany();
});

afterAll(async () => {
  await prisma.vehicle.deleteMany();
  await teardownTestDatabase();
});

describe('Vehicles API', () => {
  describe('POST /api/v1/vehicles', () => {
    it('should create a vehicle', async () => {
      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          make: 'Toyota',
          model: 'Vios',
          year: 2023,
          color: 'Silver',
          licensePlate: 'ABC-1234',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.make).toBe('Toyota');
      expect(response.body.model).toBe('Vios');
      expect(response.body.year).toBe(2023);
      expect(response.body.color).toBe('Silver');
      expect(response.body.licensePlate).toBe('ABC-1234');
      expect(response.body.userId).toBe(testData.users.driver.id);
    });

    it('should set first vehicle as default', async () => {
      await prisma.vehicle.deleteMany();

      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          make: 'Honda',
          model: 'Civic',
          year: 2022,
          color: 'Black',
          licensePlate: 'FIRST-001',
        });

      expect(response.status).toBe(201);
      expect(response.body.isDefault).toBe(true);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          make: 'Toyota',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid license plate format', async () => {
      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          make: 'Toyota',
          model: 'Vios',
          year: 2023,
          color: 'Red',
          licensePlate: '!!!INVALID!!!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/license plate/i);
    });

    it('should return 400 for duplicate license plate', async () => {
      await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          make: 'Toyota',
          model: 'Vios',
          year: 2023,
          color: 'Blue',
          licensePlate: 'DUP-001',
        });

      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          make: 'Honda',
          model: 'Civic',
          year: 2022,
          color: 'White',
          licensePlate: 'DUP-001',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/already registered/i);
    });

    it('should return 400 for invalid year', async () => {
      const response = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          make: 'Toyota',
          model: 'Vios',
          year: 1800,
          color: 'Red',
          licensePlate: 'YEAR-TEST1',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/year/i);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .post('/api/v1/vehicles')
        .send({
          make: 'Toyota',
          model: 'Vios',
          year: 2023,
          color: 'Silver',
          licensePlate: 'NOAUTH-001',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/vehicles', () => {
    beforeEach(async () => {
      await prisma.vehicle.deleteMany();
    });

    it('should return empty array when user has no vehicles', async () => {
      const response = await request(app)
        .get('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return user vehicles', async () => {
      await prisma.vehicle.create({
        data: {
          userId: testData.users.driver.id,
          make: 'Toyota',
          model: 'Vios',
          year: 2023,
          color: 'Silver',
          licensePlate: 'LIST-001',
        },
      });

      const response = await request(app)
        .get('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].make).toBe('Toyota');
    });

    it('should not return vehicles belonging to other users', async () => {
      await prisma.vehicle.create({
        data: {
          userId: testData.users.driver.id,
          make: 'Toyota',
          model: 'Vios',
          year: 2023,
          color: 'Silver',
          licensePlate: 'MINE-001',
        },
      });
      await prisma.vehicle.create({
        data: {
          userId: testData.users.host.id,
          make: 'Honda',
          model: 'Civic',
          year: 2022,
          color: 'Black',
          licensePlate: 'OTHERS-001',
        },
      });

      const response = await request(app)
        .get('/api/v1/vehicles')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].make).toBe('Toyota');
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/v1/vehicles');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/vehicles/:id', () => {
    let vehicleId;

    beforeEach(async () => {
      await prisma.vehicle.deleteMany();
      const vehicle = await prisma.vehicle.create({
        data: {
          userId: testData.users.driver.id,
          make: 'Toyota',
          model: 'Vios',
          year: 2023,
          color: 'Silver',
          licensePlate: 'GET-001',
        },
      });
      vehicleId = vehicle.id;
    });

    it('should return a vehicle by id', async () => {
      const response = await request(app)
        .get(`/api/v1/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(vehicleId);
      expect(response.body.make).toBe('Toyota');
    });

    it('should return 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .get('/api/v1/vehicles/999999')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 for vehicle belonging to another user', async () => {
      const otherVehicle = await prisma.vehicle.create({
        data: {
          userId: testData.users.host.id,
          make: 'Honda',
          model: 'Civic',
          year: 2022,
          color: 'Black',
          licensePlate: 'NOTMINE-01',
        },
      });

      const response = await request(app)
        .get(`/api/v1/vehicles/${otherVehicle.id}`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .get(`/api/v1/vehicles/${vehicleId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/v1/vehicles/:id', () => {
    let vehicleId;

    beforeEach(async () => {
      await prisma.vehicle.deleteMany();
      const vehicle = await prisma.vehicle.create({
        data: {
          userId: testData.users.driver.id,
          make: 'Toyota',
          model: 'Vios',
          year: 2023,
          color: 'Silver',
          licensePlate: 'UPD-001',
        },
      });
      vehicleId = vehicle.id;
    });

    it('should update a vehicle', async () => {
      const response = await request(app)
        .put(`/api/v1/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({
          make: 'Honda',
          model: 'Accord',
          color: 'Blue',
        });

      expect(response.status).toBe(200);
      expect(response.body.make).toBe('Honda');
      expect(response.body.model).toBe('Accord');
      expect(response.body.color).toBe('Blue');
    });

    it('should return 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .put('/api/v1/vehicles/999999')
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({ make: 'Honda' });

      expect(response.status).toBe(404);
    });

    it('should return 404 when updating vehicle of another user', async () => {
      const otherVehicle = await prisma.vehicle.create({
        data: {
          userId: testData.users.host.id,
          make: 'Honda',
          model: 'Civic',
          year: 2022,
          color: 'Black',
          licensePlate: 'NOTUPD-01',
        },
      });

      const response = await request(app)
        .put(`/api/v1/vehicles/${otherVehicle.id}`)
        .set('Authorization', `Bearer ${authTokens.driver}`)
        .send({ make: 'Hacked' });

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .put(`/api/v1/vehicles/${vehicleId}`)
        .send({ make: 'Honda' });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/vehicles/:id', () => {
    let vehicleId;

    beforeEach(async () => {
      await prisma.vehicle.deleteMany();
      const vehicle = await prisma.vehicle.create({
        data: {
          userId: testData.users.driver.id,
          make: 'Toyota',
          model: 'Vios',
          year: 2023,
          color: 'Silver',
          licensePlate: 'DEL-001',
        },
      });
      vehicleId = vehicle.id;
    });

    it('should delete a vehicle', async () => {
      const response = await request(app)
        .delete(`/api/v1/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      const check = await request(app)
        .get(`/api/v1/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(check.status).toBe(404);
    });

    it('should return 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .delete('/api/v1/vehicles/999999')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 when deleting vehicle of another user', async () => {
      const otherVehicle = await prisma.vehicle.create({
        data: {
          userId: testData.users.host.id,
          make: 'Honda',
          model: 'Civic',
          year: 2022,
          color: 'Black',
          licensePlate: 'NOTDEL-01',
        },
      });

      const response = await request(app)
        .delete(`/api/v1/vehicles/${otherVehicle.id}`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
      const response = await request(app)
        .delete(`/api/v1/vehicles/${vehicleId}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/vehicles/:id/default', () => {
    beforeEach(async () => {
      await prisma.vehicle.deleteMany();
    });

    it('should set a vehicle as default', async () => {
      const v1 = await prisma.vehicle.create({
        data: {
          userId: testData.users.driver.id,
          make: 'Toyota',
          model: 'Vios',
          year: 2023,
          color: 'Silver',
          licensePlate: 'DEF-001',
        },
      });

      const v2 = await prisma.vehicle.create({
        data: {
          userId: testData.users.driver.id,
          make: 'Honda',
          model: 'Civic',
          year: 2022,
          color: 'Black',
          licensePlate: 'DEF-002',
          isDefault: true,
        },
      });

      const response = await request(app)
        .post(`/api/v1/vehicles/${v1.id}/default`)
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(200);
      expect(response.body.isDefault).toBe(true);
      expect(response.body.id).toBe(v1.id);
    });

    it('should return 404 for non-existent vehicle', async () => {
      const response = await request(app)
        .post('/api/v1/vehicles/999999/default')
        .set('Authorization', `Bearer ${authTokens.driver}`);

      expect(response.status).toBe(404);
    });
  });
});
