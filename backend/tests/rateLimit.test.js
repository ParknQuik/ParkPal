const request = require('supertest');
const app = require('../index');

describe('API method-aware rate limiting', () => {
  it('uses the relaxed read limiter for GET requests', async () => {
    const response = await request(app).get('/api/v1/not-found-for-rate-limit-test');

    expect(response.headers['ratelimit-limit']).toBe('1200');
  });

  it('uses the map discovery read limiter for marketplace search reads', async () => {
    const response = await request(app)
      .get('/api/v1/marketplace/search?lat=14.5312&lon=120.9844&radius=3');

    expect(response.headers['ratelimit-limit']).toBe('2400');
  });

  it('uses the map discovery read limiter for candidate pin reads', async () => {
    const response = await request(app)
      .get('/api/v1/marketplace/discovery/candidates?lat=14.5312&lon=120.9844&radius=3');

    expect(response.headers['ratelimit-limit']).toBe('2400');
  });

  it('uses the stricter write limiter for mutating requests', async () => {
    const response = await request(app).post('/api/v1/not-found-for-rate-limit-test').send({});

    expect(response.headers['ratelimit-limit']).toBe('100');
  });

  it('keeps auth attempts in the stricter write bucket before route auth handling', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({});

    expect(response.headers['ratelimit-limit']).toBe('100');
  });
});
