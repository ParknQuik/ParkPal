const request = require('supertest');
const app = require('../index');

describe('API method-aware rate limiting', () => {
  it('uses the relaxed read limiter for GET requests', async () => {
    const response = await request(app).get('/api/v1/not-found-for-rate-limit-test');

    expect(response.headers['ratelimit-limit']).toBe('600');
  });

  it('uses the stricter write limiter for mutating requests', async () => {
    const response = await request(app).post('/api/v1/not-found-for-rate-limit-test').send({});

    expect(response.headers['ratelimit-limit']).toBe('100');
  });
});
