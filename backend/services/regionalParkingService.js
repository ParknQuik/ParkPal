const regions = require('../config/parkingRegions');
const crypto = require('crypto');
const regionFor = (code) => {
  const region = regions[code];
  if (!region?.enabled) throw Object.assign(new Error('Region is not enabled'), { statusCode: 400 });
  return region;
};
const inside = (b, lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && lat >= b.south && lat <= b.north && lon >= b.west && lon <= b.east;

// Accept a complete GeoJSON parking extract; validate before starting the transaction.
async function importOsm(prisma, regionCode, collection, now = new Date()) {
  const region = regionFor(regionCode);
  if (!region.sources.osm.enabled || collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features) || !collection.features.length) throw new Error('A non-empty complete OSM extract is required');
  const records = collection.features.map((feature) => {
    const tags = feature.properties || {};
    const [longitude, latitude] = feature.geometry?.coordinates || [];
    const sourceId = String(feature.id || tags['@id'] || '');
    if (!/^(node|way|relation)\/\d+$/.test(sourceId) || feature.geometry?.type !== 'Point' || !inside(region.bounds, latitude, longitude) || tags.amenity !== 'parking') throw new Error('Invalid OSM parking feature');
    return { regionCode, source: 'osm', sourceId, name: tags.name || 'Parking facility', latitude, longitude, address: tags['addr:full'] || null, capacity: /^\d+$/.test(String(tags.capacity)) && Number(tags.capacity) <= 2147483647 ? Number(tags.capacity) : null, access: tags.access || null, importedAt: now, isActive: true };
  });
  if (new Set(records.map(r => r.sourceId)).size !== records.length) throw new Error('Duplicate OSM identities');
  return prisma.$transaction(async (tx) => {
    for (const record of records) await tx.regionalParkingFacility.upsert({ where: { source_sourceId: { source: 'osm', sourceId: record.sourceId } }, create: record, update: record });
    await tx.regionalParkingFacility.updateMany({ where: { regionCode, source: 'osm', sourceId: { notIn: records.map(r => r.sourceId) } }, data: { isActive: false } });
    return { imported: records.length, importedAt: now };
  }, { timeout: 120000 });
}
function presentFacility(facility, now = new Date()) {
  const region = regionFor(facility.regionCode);
  const age = now - new Date(facility.partnerUpdatedAt);
  const fresh = facility.partnerUpdatedAt && age >= 0 && age <= region.partnerFreshnessSeconds * 1000;
  return { id: `osm-${facility.id}`, isPreview: true, canShowAnalytics: false, address: facility.address, category: 'external_preview', source: facility.source, sourceId: facility.sourceId, title: facility.name, latitude: facility.latitude, longitude: facility.longitude, canBook: false, attribution: region.sources[facility.source]?.attribution, importedAt: facility.importedAt,
    sourceCapacity: facility.capacity, sourceAccess: facility.access,
    partnerAvailability: facility.partner?.isVerified && facility.partner?.isActive && fresh ? { category: 'partner_reported_occupancy', partner: facility.partner.name, availableCount: facility.availableCount, occupiedCount: facility.occupiedCount, updatedAt: facility.partnerUpdatedAt, expiresAt: new Date(+new Date(facility.partnerUpdatedAt) + region.partnerFreshnessSeconds * 1000) } : null };
}
async function updatePartner(prisma, token, facilityId, input, now = new Date()) {
  if (typeof token !== 'string' || token.length < 32) throw new Error('Invalid partner credentials');
  const partner = await prisma.parkingPartner.findUnique({ where: { apiKeyHash: crypto.createHash('sha256').update(token).digest('hex') } });
  if (!partner?.isVerified || !partner.isActive) throw new Error('Invalid partner credentials');
  const timestamp = new Date(input?.updatedAt);
  if (!input) throw new Error('Invalid availability update');
  if (!Number.isSafeInteger(input.availableCount) || input.availableCount < 0 || !Number.isSafeInteger(input.occupiedCount) || input.occupiedCount < 0 || !Number.isFinite(+timestamp) || timestamp > now || input.availableCount > 2147483647 || input.occupiedCount > 2147483647) throw new Error('Invalid availability update');
  const result = await prisma.regionalParkingFacility.updateMany({ where: { id: facilityId, partnerId: partner.id, isActive: true, OR: [{ partnerUpdatedAt: null }, { partnerUpdatedAt: { lt: timestamp } }] }, data: { availableCount: input.availableCount, occupiedCount: input.occupiedCount, partnerUpdatedAt: timestamp } });
  return { accepted: result.count === 1 };
}
async function discoverRegional(prisma, area) {
  const records = [];
  let truncated = false;
  for (const [code, region] of Object.entries(regions)) {
    if (!region.enabled) continue;
    const bounds = area.bounds || { south: area.lat - area.radiusMeters / 111000, north: area.lat + area.radiusMeters / 111000, west: area.lon - area.radiusMeters / (111000 * Math.cos(area.lat * Math.PI / 180)), east: area.lon + area.radiusMeters / (111000 * Math.cos(area.lat * Math.PI / 180)) };
    if (bounds.north < region.bounds.south || bounds.south > region.bounds.north || bounds.east < region.bounds.west || bounds.west > region.bounds.east) continue;
    const remaining = 26 - records.length;
    if (remaining <= 0) {
      truncated = true;
      break;
    }
    const found = await prisma.regionalParkingFacility.findMany({ where: { regionCode: code, isActive: true, latitude: { gte: bounds.south, lte: bounds.north }, longitude: { gte: bounds.west, lte: bounds.east } }, include: { partner: true }, take: remaining, orderBy: { id: 'asc' } });
    records.push(...found.slice(0, remaining));
    truncated ||= found.length > remaining || records.length > 25;
  }
  const pins = records.slice(0, 25).map(facility => presentFacility(facility));
  pins.truncated = truncated;
  return pins;
}
module.exports = { discoverRegional, regionFor, inside, importOsm, presentFacility, updatePartner };
