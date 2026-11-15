const express = require('express');

jest.mock('../config/redis', () => ({ ping: jest.fn().mockResolvedValue('PONG') }));
jest.mock('../services/auth', () => ({ authenticate: (req, res, next) => next() }));

jest.mock('../services/webPerformanceMetrics', () => ({
  recordWebPerformanceMetric: jest.fn().mockResolvedValue({ id: 1 }),
}));

const { recordWebPerformanceMetric } = require('../services/webPerformanceMetrics');
const analyticsRoutes = require('../routes/analytics');
const router = express.Router();
analyticsRoutes(router);
const route = router.stack.find((layer) => layer.route?.path === '/analytics/performance').route;

async function invokeRoute({ consent, body }) {
  const response = { statusCode: 200, body: null };
  response.status = function status(code) { this.statusCode = code; return this; };
  response.json = function json(value) { this.body = value; return this; };
  const req = { body, get: (name) => name.toLowerCase() === 'x-parkpal-analytics-consent' ? consent : undefined };
  const handlers = route.stack.map((layer) => layer.handle);
  const run = async (index, error) => {
    if (error) {
      response.statusCode = error.statusCode || 500;
      response.body = { error: error.message };
      return;
    }
    if (!handlers[index]) return;
    await handlers[index](req, response, (nextError) => run(index + 1, nextError));
  };
  await run(0);
  return response;
}

describe('consent-gated web performance endpoint', () => {
  beforeEach(() => jest.clearAllMocks());

  test('does not store samples without the consent header', async () => {
    const response = await invokeRoute({ body: { name: 'LCP', value: 1800, rating: 'good' } });

    expect(response.statusCode).toBe(403);
    expect(recordWebPerformanceMetric).not.toHaveBeenCalled();
  });

  test('accepts a valid consented sample without persisting identifiers', async () => {
    const response = await invokeRoute({ consent: 'granted', body: { name: 'CLS', value: 0.04, rating: 'good' } });

    expect(response.statusCode).toBe(202);
    expect(recordWebPerformanceMetric).toHaveBeenCalledWith({ name: 'CLS', value: 0.04, rating: 'good' });
  });

  test('rejects unsupported metric names', async () => {
    const response = await invokeRoute({ consent: 'granted', body: { name: 'email', value: 5, rating: 'good' } });

    expect(response.statusCode).toBe(400);
    expect(recordWebPerformanceMetric).not.toHaveBeenCalled();
  });
});
