// Run explicitly with an isolated Jest config (no database setup).
const { createClient } = require('redis');
const mockClient = createClient({ url: process.env.REDIS_QUOTA_TEST_URL || 'redis://127.0.0.1:6379', socket: { reconnectStrategy: false, connectTimeout: 2000 } });
const mockKeys = new Set();
jest.mock('../config/redis', () => ({
  eval: (script, options) => {
    options.keys.forEach(key => mockKeys.add(key));
    return mockClient.eval(script, options);
  },
}));
const { reserve } = require('../services/googleDiscoveryQuota');
const deployment = 'quota-test-' + process.pid + '-' + Date.now();
const originalDeployment = process.env.GOOGLE_DISCOVERY_DEPLOYMENT;
(process.env.REDIS_QUOTA_TEST_URL ? describe : describe.skip)('local Redis quota gate', () => {
beforeAll(async () => {
  process.env.GOOGLE_DISCOVERY_DEPLOYMENT = deployment;
  await mockClient.connect();
});
afterAll(async () => {
  if (mockClient.isOpen) {
    if (mockKeys.size) await mockClient.del([...mockKeys]);
    await mockClient.quit();
  }
  if (originalDeployment === undefined) delete process.env.GOOGLE_DISCOVERY_DEPLOYMENT;
  else process.env.GOOGLE_DISCOVERY_DEPLOYMENT = originalDeployment;
});
test('concurrent reservations never exceed 100; actor cooldown spans UTC midnight and next day resets budget', async () => {
  const now = new Date('2026-11-17T12:00:00Z');
  const results = await Promise.allSettled(Array.from({ length: 120 }, (_, i) => reserve('account:' + i, now)));
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(100);
  expect(results.filter(r => r.status === 'rejected').every(r => r.reason.statusCode === 429)).toBe(true);
  expect(await mockClient.get('google-discovery:{' + deployment + '}:day:2026-11-17')).toBe('100');
  await expect(reserve('next-day', new Date('2026-11-18T00:00:00Z'))).resolves.toBe(1);
  await expect(reserve('next-day', new Date('2026-11-19T00:00:00Z'))).rejects.toMatchObject({ statusCode: 429 });
});
test('same actor concurrent actions reserve only once; cooldown expiration permits another action', async () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => reserve('shared-actor', now)));
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  const crypto = require('crypto');
  const actorKey = 'google-discovery:{' + deployment + '}:actor:' + crypto.createHash('sha256').update('shared-actor').digest('hex');
  expect(await mockClient.ttl(actorKey)).toBeGreaterThan(0);
  await mockClient.expire(actorKey, 0);
  await expect(reserve('shared-actor', now)).resolves.toBe(2);
});

});
