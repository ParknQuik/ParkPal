const express = require('express');

let mockRole = 'admin';
let mockAuthenticated = true;

jest.mock('../services/auth', () => ({
  authenticate: (req, res, next) => {
    if (!mockAuthenticated) return next(Object.assign(new Error('No token provided'), { statusCode: 401 }));
    req.user = { id: 1, role: mockRole };
    return next();
  },
}));

jest.mock('../controllers/adminMetricsController', () => ({
  getDashboardMetrics: (req, res) => res.json({ period: req.query.period || '24h' }),
}));

const adminMetricsRoutes = require('../routes/adminMetrics');
const router = express.Router();
adminMetricsRoutes(router);
const route = router.stack.find((layer) => layer.route?.path === '/admin/dashboard/metrics').route;

async function invokeRoute(query = {}) {
  const response = { statusCode: 200, body: null };
  response.status = function status(code) { this.statusCode = code; return this; };
  response.json = function json(body) { this.body = body; return this; };
  const req = { query };
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

describe('admin dashboard metrics route access', () => {
  beforeEach(() => { mockRole = 'admin'; mockAuthenticated = true; });

  test('allows admins to retrieve dashboard metrics', async () => {
    const response = await invokeRoute({ period: '7d' });
    expect(response.statusCode).toBe(200);
    expect(response.body.period).toBe('7d');
  });

  test.each(['driver', 'host'])('rejects %s accounts', async (accountRole) => {
    mockRole = accountRole;
    const response = await invokeRoute();
    expect(response.statusCode).toBe(403);
  });

  test('rejects unauthenticated requests', async () => {
    mockAuthenticated = false;
    const response = await invokeRoute();
    expect(response.statusCode).toBe(401);
  });
});
