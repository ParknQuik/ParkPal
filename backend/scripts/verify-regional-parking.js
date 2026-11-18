// Database integration check: all fixture writes are rolled back.
require('dotenv').config();
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const prisma = require('../config/prisma');
const { updatePartner, presentFacility } = require('../services/regionalParkingService');
(async () => {
  const url = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Integration fixture check requires a local database');
  const rollback = new Error('ROLLBACK_VERIFICATION');
  try {
    await prisma.$transaction(async tx => {
      const token = crypto.randomBytes(32).toString('hex');
      const partner = await tx.parkingPartner.create({ data: { name: 'Temporary integration fixture', apiKeyHash: crypto.createHash('sha256').update(token).digest('hex'), isVerified: true } });
      const facility = await tx.regionalParkingFacility.create({ data: { regionCode: 'ph-metro-manila', source: 'integration_fixture', sourceId: crypto.randomUUID(), name: 'Temporary fixture', latitude: 14.6, longitude: 121, partnerId: partner.id } });
      const now = new Date();
      const update = { availableCount: 12, occupiedCount: 38, updatedAt: now.toISOString() };
      assert.equal((await updatePartner(tx, token, facility.id, update, now)).accepted, true);
      assert.equal((await updatePartner(tx, token, facility.id, update, now)).accepted, false);
      assert.equal((await updatePartner(tx, token, facility.id, { ...update, updatedAt: new Date(+now - 1).toISOString() }, now)).accepted, false);
      assert.equal((await updatePartner(tx, token, facility.id + 1, update, now)).accepted, false);
      await assert.rejects(updatePartner(tx, 'invalid'.repeat(8), facility.id, update, now), /credentials/);
      const saved = await tx.regionalParkingFacility.findUnique({ where: { id: facility.id }, include: { partner: true } });
      assert.equal(presentFacility(saved, now).partnerAvailability.availableCount, 12);
      assert.equal(presentFacility(saved, new Date(+now + 300001)).partnerAvailability, null);
      await tx.parkingPartner.update({ where: { id: partner.id }, data: { isVerified: false } });
      await assert.rejects(updatePartner(tx, token, facility.id, update, now), /credentials/);
      throw rollback;
    });
  } catch (error) { if (error !== rollback) throw error; }
  console.log('PASS: real database authentication, ownership, duplicates, ordering, freshness, revocation; fixture transaction rolled back');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
