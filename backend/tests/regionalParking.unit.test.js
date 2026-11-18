const { importOsm, presentFacility, updatePartner, inside, regionFor } = require('../services/regionalParkingService');
const regions = require('../config/parkingRegions');
const now = new Date('2026-11-17T10:00:00Z');
const feature = { type: 'Feature', id: 'node/123', geometry: { type: 'Point', coordinates: [121, 14.6] }, properties: { amenity: 'parking', capacity: '100' } };
const extract = { type: 'FeatureCollection', features: [feature] };
const facility = { id: 1, regionCode: 'ph-metro-manila', source: 'osm', partnerUpdatedAt: now, partner: { name: 'Operator', isVerified: true, isActive: true }, availableCount: 3, occupiedCount: 4 };
function database() {
  const db = { regionalParkingFacility: { upsert: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) } };
  db.$transaction = jest.fn(fn => fn(db));
  return db;
}
test('regional boundaries and configuration allow another reviewed market', () => {
  expect(inside(regionFor('ph-metro-manila').bounds, 14.6, 121)).toBe(true);
  expect(inside(regionFor('ph-metro-manila').bounds, 15, 121)).toBe(false);
  regions.test = { ...regions['ph-metro-manila'], enabled: true };
  expect(regionFor('test').enabled).toBe(true);
  delete regions.test;
  expect(() => regionFor('test')).toThrow();
});
test('imports source identities and deactivates missing features only in the same region', async () => {
  const db = database();
  await importOsm(db, 'ph-metro-manila', extract, now);
  expect(db.regionalParkingFacility.upsert.mock.calls[0][0].create).toMatchObject({ source: 'osm', sourceId: 'node/123', capacity: 100, importedAt: now });
  expect(db.regionalParkingFacility.updateMany.mock.calls[0][0].where).toEqual({ source: 'osm', regionCode: 'ph-metro-manila', sourceId: { notIn: ['node/123'] } });
});
test('bad or empty refresh cannot deactivate existing facilities', async () => {
  const db = database();
  await expect(importOsm(db, 'ph-metro-manila', { ...extract, features: [] })).rejects.toThrow();
  await expect(importOsm(db, 'ph-metro-manila', { ...extract, features: [feature, feature] })).rejects.toThrow();
  expect(db.$transaction).not.toHaveBeenCalled();
});
test('partner freshness expires independently of facility discovery and crowd guidance', () => {
  expect(presentFacility(facility, now).partnerAvailability.availableCount).toBe(3);
  expect(presentFacility(facility, new Date(+now + 300001)).partnerAvailability).toBeNull();
  expect(presentFacility({ ...facility, partner: { ...facility.partner, isVerified: false } }, now).partnerAvailability).toBeNull();
  expect(presentFacility(facility, now)).toMatchObject({ canBook: false, canShowAnalytics: false, attribution: '© OpenStreetMap contributors' });
});
test('authenticated updates use atomic facility ownership and monotonic timestamp conditions', async () => {
  const db = database();
  db.parkingPartner = { findUnique: jest.fn().mockResolvedValue({ id: 2, isVerified: true, isActive: true }) };
  const token = 'a'.repeat(64);
  await updatePartner(db, token, 1, { availableCount: 0, occupiedCount: 10, updatedAt: now.toISOString() }, now);
  expect(db.parkingPartner.findUnique.mock.calls[0][0].where.apiKeyHash).not.toBe(token);
  expect(db.regionalParkingFacility.updateMany.mock.calls[0][0].where).toMatchObject({ id: 1, partnerId: 2, OR: [{ partnerUpdatedAt: null }, { partnerUpdatedAt: { lt: now } }] });
  db.regionalParkingFacility.updateMany.mockResolvedValue({ count: 0 });
  expect(await updatePartner(db, token, 1, { availableCount: 0, occupiedCount: 10, updatedAt: now.toISOString() }, now)).toEqual({ accepted: false });
  await expect(updatePartner(db, 'bad', 1, {}, now)).rejects.toThrow('credentials');
  await expect(updatePartner(db, token, 1, { availableCount: -1 }, now)).rejects.toThrow('Invalid availability');
});
