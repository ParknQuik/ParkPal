const mockDb = {
  parkingCandidate: { findMany: jest.fn(), create: jest.fn(), createMany: jest.fn(), update: jest.fn() },
  regionalParkingFacility: { findMany: jest.fn() },
  crowdParkingMetric: { findMany: jest.fn() },
};
jest.mock('../config/prisma', () => mockDb);
jest.mock('../config/redis', () => ({ eval: jest.fn() }));
jest.mock('axios', () => ({ get: jest.fn() }));
jest.mock('../services/mediaService', () => ({}));
jest.mock('../services/paymongo', () => ({}));
jest.mock('../services/qrcode', () => ({}));
jest.mock('../services/websocket', () => ({ broadcast: jest.fn() }));
const redis = require('../config/redis');
const axios = require('axios');
const quota = require('../services/googleDiscoveryQuota');
const service = require('../services/parkingCandidateScanService');
const controller = require('../controllers/marketplaceController');
const bounds = { south: 14.59, west: 120.97, north: 14.61, east: 120.99 };
beforeEach(() => {
  jest.clearAllMocks();
  process.env.GOOGLE_PLACES_API_KEY = 'test-key';
  redis.eval.mockResolvedValue(1);
  mockDb.parkingCandidate.findMany.mockResolvedValue([]);
  mockDb.regionalParkingFacility.findMany.mockResolvedValue([]);
  mockDb.crowdParkingMetric.findMany.mockResolvedValue([]);
});
test('local discovery performs no provider requests or candidate writes and preserves eligible crowd guidance', async () => {
  mockDb.parkingCandidate.findMany.mockResolvedValue([{ id: 4, linkedZoneId: 9, candidateStatus: 'geofence_verified',
    linkedZone: { id: 9, centerLat: 14.6, centerLon: 120.98, name: 'Community garage', address: 'Street' } }]);
  mockDb.crowdParkingMetric.findMany.mockResolvedValue([{ zoneId: 9, sampleCount: 3, avgCirclingTimeSeconds: 360 }]);
  const res = { json: jest.fn() }; const next = jest.fn();
  await controller.getDiscoveryCandidates({ query: bounds }, res, next);
  expect(next).not.toHaveBeenCalled();
  expect(res.json.mock.calls[0][0].data[0]).toMatchObject({ id: 'zone-9', canBook: false, crowdGuidance: { sampleCount: 3 } });
  expect(mockDb.crowdParkingMetric.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ sampleCount: { gte: 3 } }) }));
  expect(axios.get).not.toHaveBeenCalled();
  expect(redis.eval).not.toHaveBeenCalled();
  expect(mockDb.parkingCandidate.create).not.toHaveBeenCalled();
  expect(mockDb.parkingCandidate.createMany).not.toHaveBeenCalled();
  expect(mockDb.parkingCandidate.update).not.toHaveBeenCalled();
});
test('explicit discovery reserves once, makes one page request, uses returned display fields and stable Place identities', async () => {
  axios.get.mockResolvedValue({ data: { status: 'OK', next_page_token: 'ignored',
    results: Array.from({ length: 25 }, (_, i) => ({ place_id: String(i), name: 'Garage', vicinity: 'Street', geometry: { location: { lat: 14.6, lng: 120.98 } } })) } });
  const result = await service.getDriverDiscoveryCandidates(bounds, 'account:1');
  expect(result.candidates).toHaveLength(20);
  expect(result.candidates[0]).toMatchObject({ id: 'google-0', title: 'Garage', address: 'Street', canBook: false });
  expect(result.metadata.providerLimited).toBe(true);
  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(axios.get.mock.calls[0][0]).toContain('nearbysearch');
  expect(redis.eval).toHaveBeenCalledTimes(1);
  expect(mockDb.parkingCandidate.createMany).toHaveBeenCalledWith({
    data: Array.from({ length: 20 }, (_, i) => ({ googlePlaceId: String(i), scanArea: 'driver_discovery', scanSource: 'google_places' })),
    skipDuplicates: true,
  });
  expect(JSON.stringify(mockDb.parkingCandidate.createMany.mock.calls[0])).not.toContain('Garage');
  expect(JSON.stringify(mockDb.parkingCandidate.createMany.mock.calls[0])).not.toContain('Street');
  expect(mockDb.parkingCandidate.update).not.toHaveBeenCalled();
});
test('concurrent explicit searches share quota reservation, provider request, and Place ID write', async () => {
  let resolve;
  axios.get.mockReturnValue(new Promise(done => { resolve = done; }));
  const first = service.getDriverDiscoveryCandidates(bounds, 'account:1');
  const second = service.getDriverDiscoveryCandidates(bounds, 'account:1');
  expect(first).toBe(second);
  resolve({ data: { status: 'OK', results: [{ place_id: 'shared', name: 'Garage', geometry: { location: { lat: 14.6, lng: 120.98 } } }] } });
  await Promise.all([first, second]);
  expect(redis.eval).toHaveBeenCalledTimes(1);
  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(mockDb.parkingCandidate.createMany).toHaveBeenCalledTimes(1);
});
test('provider failure consumes reservation and is never retried', async () => {
  axios.get.mockRejectedValue(new Error('offline'));
  await expect(service.getDriverDiscoveryCandidates(bounds, 'ip:1')).rejects.toThrow();
  expect(redis.eval).toHaveBeenCalledTimes(1);
  expect(axios.get).toHaveBeenCalledTimes(1);
});
test.each([[-1, 429], [-2, 429], [0, 503]])('denied quota %s prevents outbound requests', async (result, statusCode) => {
  redis.eval.mockResolvedValue(result);
  await expect(service.getDriverDiscoveryCandidates(bounds, 'account:1')).rejects.toMatchObject({ statusCode });
  expect(axios.get).not.toHaveBeenCalled();
});
test('Redis failure disables paid discovery', async () => {
  redis.eval.mockRejectedValue(new Error('unavailable'));
  await expect(service.getDriverDiscoveryCandidates(bounds, 'account:1')).rejects.toMatchObject({ statusCode: 503 });
  expect(axios.get).not.toHaveBeenCalled();
});
test('UTC daily keys reset at midnight and actor cooldown identity is hashed and stable', async () => {
  await quota.reserve('ip:192.0.2.1', new Date('2026-11-17T23:59:59Z'));
  await quota.reserve('ip:192.0.2.1', new Date('2026-11-18T00:00:00Z'));
  const before = redis.eval.mock.calls[0][1]; const after = redis.eval.mock.calls[1][1];
  expect(before.keys[0]).toContain('2026-11-17');
  expect(after.keys[0]).toContain('2026-11-18');
  expect(before.keys[1]).toBe(after.keys[1]);
  expect(before.keys[1]).not.toContain('192.0.2.1');
  expect(before.arguments).toEqual(['1']);
  expect(after.arguments).toEqual(['86400']);
});
test('local discovery caps each external category at 25 and reports overflow', async () => {
  mockDb.regionalParkingFacility.findMany.mockResolvedValue(Array.from({ length: 26 }, (_, id) =>
    ({ id, regionCode: 'ph-metro-manila', source: 'osm', latitude: 14.6, longitude: 120.98 })));
  const res = { json: jest.fn() };
  await controller.getDiscoveryCandidates({ query: bounds }, res, jest.fn());
  expect(res.json.mock.calls[0][0].discovery.truncated).toBe(true);
  expect(res.json.mock.calls[0][0].data).toHaveLength(25);
  expect(mockDb.regionalParkingFacility.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 26 }));
});
test('community guidance is capped at 25 and reports a 26th matching record', async () => {
  mockDb.parkingCandidate.findMany.mockResolvedValue(Array.from({ length: 26 }, (_, id) => ({
    id, linkedZoneId: id + 1, candidateStatus: 'commercial_verified',
    linkedZone: { id: id + 1, centerLat: 14.6, centerLon: 120.98, name: 'Community garage' },
  })));
  const res = { json: jest.fn() };
  await controller.getDiscoveryCandidates({ query: bounds }, res, jest.fn());
  expect(res.json.mock.calls[0][0].discovery.truncated).toBe(true);
  expect(res.json.mock.calls[0][0].data).toHaveLength(25);
  expect(mockDb.parkingCandidate.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 26 }));
});
test('Google POST uses authenticated account identity and prevents response storage', async () => {
  axios.get.mockResolvedValue({ data: { status: 'ZERO_RESULTS', results: [] } });
  const res = { json: jest.fn(), set: jest.fn() }; const next = jest.fn();
  await controller.getGoogleDiscovery({ body: bounds, user: { id: 42 }, ip: '192.0.2.1' }, res, next);
  expect(next).not.toHaveBeenCalled();
  const crypto = require('crypto');
  expect(redis.eval.mock.calls[0][1].keys[1]).toContain(crypto.createHash('sha256').update('account:42').digest('hex'));
  expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
  expect(res.json.mock.calls[0][0].data).toEqual([]);
});
test('Google actions require complete ordered latitude bounds', () => {
  const { discoveryCandidatesSchema } = require('../validators/marketplace');
  const schema = discoveryCandidatesSchema.fork(['south', 'west', 'north', 'east'], field => field.required());
  expect(schema.validate(bounds).error).toBeUndefined();
  expect(schema.validate({ lat: 14.6, lon: 121 }).error).toBeDefined();
  expect(schema.validate({ ...bounds, north: bounds.south }).error).toBeDefined();
});
