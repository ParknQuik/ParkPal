const { EventEmitter } = require('events');

const mockRedisStore = new Map();
jest.mock('../config/redis', () => ({
  incrementWithExpiry: jest.fn(async (key) => {
    const count = (mockRedisStore.get(key) || 0) + 1;
    mockRedisStore.set(key, count);
    return count;
  }),
  get: jest.fn(async (key) => mockRedisStore.get(key) || null),
}));
jest.mock('../config/secretManager', () => ({ getSecret: jest.fn(async () => 'test-hmac-secret') }));
jest.mock('../config/logger', () => ({ info: jest.fn(), warn: jest.fn() }));

const redis = require('../config/redis');
const { authRateLimit } = require('../middleware/authRateLimit');

function request(ip, body = {}) {
  return { ip, body, socket: { remoteAddress: ip } };
}

function response() {
  const emitter = new EventEmitter();
  emitter.headers = {};
  emitter.set = (name, value) => { emitter.headers[name.toLowerCase()] = value; };
  emitter.status = (code) => { emitter.statusCode = code; return emitter; };
  emitter.json = (body) => { emitter.body = body; return emitter; };
  emitter.statusCode = 200;
  return emitter;
}

async function dispatch(middleware, req, statusCode = 200) {
  const res = response();
  let nextCalled = false;
  await middleware(req, res, () => { nextCalled = true; });
  if (nextCalled) {
    res.statusCode = statusCode;
    res.emit('finish');
    await new Promise((resolve) => setImmediate(resolve));
  }
  return { req, res, nextCalled };
}

describe('auth rate limiting', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.NODE_ENV = 'production';
    mockRedisStore.clear();
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('keeps login failures separate from registration and reset quotas', async () => {
    const login = authRateLimit('login');
    const register = authRateLimit('register');

    await dispatch(login, request('192.0.2.10', { email: 'Person@example.com' }), 401);

    expect(redis.incrementWithExpiry).toHaveBeenCalledWith(expect.stringMatching(/^auth-rate:login:ip:/), 900);
    expect(redis.incrementWithExpiry).toHaveBeenCalledWith(expect.stringMatching(/^auth-rate:login:account:[a-f0-9]{64}:\d+$/), 900);
    expect([...mockRedisStore.keys()].some((key) => key.includes('Person@example.com'))).toBe(false);
    expect([...mockRedisStore.keys()].some((key) => key.includes('register:'))).toBe(false);
    expect([...mockRedisStore.keys()].some((key) => key.includes('reset:'))).toBe(false);

    await dispatch(register, request('192.0.2.10', { email: 'new@example.com' }), 201);
    expect([...mockRedisStore.keys()].some((key) => key.includes('register:attempt:ip:'))).toBe(true);
    expect([...mockRedisStore.keys()].some((key) => key.includes('register:success:ip:'))).toBe(true);
    expect([...mockRedisStore.keys()].some((key) => key.includes('login:ip:'))).toBe(true);
  });

  it('does not count a successful login against the failed-login bucket', async () => {
    await dispatch(authRateLimit('login'), request('192.0.2.11', { email: 'valid@example.com' }), 200);
    expect([...mockRedisStore.keys()].some((key) => key.includes('login:ip:'))).toBe(false);
    expect([...mockRedisStore.keys()].some((key) => key.includes('login:account:'))).toBe(false);
  });

  it('limits password reset requests independently per account and IP', async () => {
    const reset = authRateLimit('reset');
    for (let i = 0; i < 3; i += 1) {
      await dispatch(reset, request('192.0.2.40', { email: 'reset@example.com' }));
    }
    const limited = await dispatch(reset, request('192.0.2.40', { email: 'reset@example.com' }));
    expect(limited.res.statusCode).toBe(429);
    expect([...mockRedisStore.keys()].some((key) => /^auth-rate:reset:account:[a-f0-9]{64}:\d+$/.test(key))).toBe(true);
    expect([...mockRedisStore.keys()].some((key) => key.includes('reset@example.com'))).toBe(false);
  });

  it('tracks client IPs independently and returns retry headers at the limit', async () => {
    const register = authRateLimit('register');
    for (let i = 0; i < 30; i += 1) {
      await dispatch(register, request('192.0.2.20'), 400);
    }

    const limited = await dispatch(register, request('192.0.2.20'));
    expect(limited.res.statusCode).toBe(429);
    expect(limited.res.headers['retry-after']).toBeDefined();
    expect(limited.res.body.retryAfter).toBeGreaterThan(0);

    const otherIp = await dispatch(register, request('192.0.2.21'));
    expect(otherIp.nextCalled).toBe(true);
  });

  it('shares a Redis-backed bucket across independently created middleware instances', async () => {
    const firstInstance = authRateLimit('register');
    const secondInstance = authRateLimit('register');
    for (let i = 0; i < 15; i += 1) {
      await dispatch(firstInstance, request('192.0.2.50'), 400);
      await dispatch(secondInstance, request('192.0.2.50'), 400);
    }
    const limited = await dispatch(firstInstance, request('192.0.2.50'));
    expect(limited.res.statusCode).toBe(429);
  });

  it('uses the emergency local counter when Redis fails', async () => {
    redis.incrementWithExpiry.mockRejectedValue(new Error('Redis offline'));
    redis.get.mockRejectedValue(new Error('Redis offline'));
    const register = authRateLimit('register');
    const result = await dispatch(register, request('192.0.2.30'));

    expect(result.nextCalled).toBe(true);
    expect(require('../config/logger').warn).toHaveBeenCalledWith(
      'Authentication rate limiting using per-instance fallback',
      expect.objectContaining({ error: 'Redis offline' }),
    );
  });
});
