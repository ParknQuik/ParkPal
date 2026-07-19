const path = require('path');
const { PrismaClient } = require('@prisma/client');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

const CENTER = {
  lat: 14.843192035750052,
  lon: 121.03686550097518,
};

const ZONE_NAME = 'Local Parking Near 14.843192, 121.036866';

const buildSquarePolygon = ({ lat, lon }, delta = 0.006) => ({
  type: 'Polygon',
  coordinates: [
    [
      [lon - delta, lat + delta],
      [lon + delta, lat + delta],
      [lon + delta, lat - delta],
      [lon - delta, lat - delta],
      [lon - delta, lat + delta],
    ],
  ],
});

const nearbySlots = [
  {
    lat: 14.843192035750052,
    lon: 121.03686550097518,
    address: 'Near user pinned location, San Jose del Monte, Bulacan',
    slotType: 'commercial_manual',
    slotNumber: 'LOCAL-A001',
    price: 25,
    description: 'Closest seeded parking spot to your pinned location.',
    amenities: ['outdoor', 'lighting', 'nearby_shops'],
    rating: 4.4,
  },
  {
    lat: 14.84362,
    lon: 121.03722,
    address: 'Local covered parking east of pinned location',
    slotType: 'commercial_manual',
    slotNumber: 'LOCAL-A002',
    price: 30,
    description: 'Covered parking with attendant near the main road.',
    amenities: ['covered', 'security', 'lighting'],
    rating: 4.6,
  },
  {
    lat: 14.84278,
    lon: 121.03638,
    address: 'Residential parking west of pinned location',
    slotType: 'roadside_qr',
    slotNumber: 'LOCAL-A003',
    price: 18,
    description: 'Budget roadside parking in a quieter residential street.',
    amenities: ['outdoor', 'quiet_area', 'lighting'],
    rating: 4.1,
  },
  {
    lat: 14.84415,
    lon: 121.03612,
    address: 'Small commercial lot north-west of pinned location',
    slotType: 'commercial_iot',
    slotNumber: 'LOCAL-A004',
    sensorId: 'sensor-local-a004',
    price: 35,
    description: 'Smart parking slot with real-time availability.',
    amenities: ['covered', 'security', 'cctv', 'mobile_app'],
    rating: 4.7,
  },
  {
    lat: 14.84225,
    lon: 121.03742,
    address: 'Open parking lot south-east of pinned location',
    slotType: 'commercial_manual',
    slotNumber: 'LOCAL-A005',
    price: 22,
    description: 'Open lot suitable for short errands and quick visits.',
    amenities: ['outdoor', 'wide_slot', 'lighting'],
    rating: 4.2,
  },
  {
    lat: 14.84474,
    lon: 121.03775,
    address: 'Gated driveway parking near pinned location',
    slotType: 'commercial_manual',
    slotNumber: 'LOCAL-A006',
    price: 32,
    description: 'Gated driveway parking with host-managed access.',
    amenities: ['covered', 'security', 'gated'],
    rating: 4.8,
  },
  {
    lat: 14.84188,
    lon: 121.03582,
    address: 'Roadside QR parking south-west of pinned location',
    slotType: 'roadside_qr',
    slotNumber: 'LOCAL-A007',
    price: 16,
    description: 'Low-cost roadside parking with QR check-in.',
    amenities: ['outdoor', 'lighting'],
    rating: 3.9,
  },
  {
    lat: 14.84535,
    lon: 121.03662,
    address: 'Premium covered slot north of pinned location',
    slotType: 'commercial_iot',
    slotNumber: 'LOCAL-A008',
    sensorId: 'sensor-local-a008',
    price: 40,
    description: 'Premium covered parking with CCTV and EV charging.',
    amenities: ['covered', 'security', 'cctv', 'ev_charging'],
    rating: 4.9,
  },
  {
    lat: 14.84298,
    lon: 121.03866,
    address: 'Market-side parking near pinned location',
    slotType: 'commercial_manual',
    slotNumber: 'LOCAL-A009',
    price: 24,
    description: 'Convenient parking near small shops and market stalls.',
    amenities: ['outdoor', 'nearby_shops', 'lighting'],
    rating: 4.3,
  },
  {
    lat: 14.84402,
    lon: 121.03521,
    address: 'Quiet residential carport near pinned location',
    slotType: 'commercial_manual',
    slotNumber: 'LOCAL-A010',
    price: 28,
    description: 'Host-managed carport in a quiet residential pocket.',
    amenities: ['covered', 'quiet_area', 'gated'],
    rating: 4.5,
  },
];

async function findOrCreateHost() {
  const hosts = await prisma.user.findMany({ where: { role: 'host' }, orderBy: { id: 'asc' } });

  if (hosts.length > 0) {
    return hosts;
  }

  console.log('No host users found. Creating a local seed host...');
  const host = await prisma.user.create({
    data: {
      name: 'Local Parking Host',
      email: 'local-host@parkpal.test',
      password: 'seed-only-password',
      role: 'host',
      phone: '+639300000000',
    },
  });

  return [host];
}

async function findOrCreateZone() {
  const existingZone = await prisma.zone.findFirst({ where: { name: ZONE_NAME } });

  const zoneData = {
    name: ZONE_NAME,
    type: 'commercial',
    address: 'Local area around pinned coordinates',
    city: 'San Jose del Monte',
    geofencePolygon: JSON.stringify(buildSquarePolygon(CENTER)),
    centerLat: CENTER.lat,
    centerLon: CENTER.lon,
    radiusMeters: 750,
    totalCapacity: nearbySlots.length,
    pricePerHour: 28,
    operatingHours: JSON.stringify({ daily: '24/7' }),
    isActive: true,
  };

  if (!existingZone) {
    return prisma.zone.create({ data: zoneData });
  }

  return prisma.zone.update({
    where: { id: existingZone.id },
    data: zoneData,
  });
}

async function upsertSlot(slot, zoneId, ownerId) {
  const existingSlot = await prisma.parkingSlot.findFirst({
    where: { slotNumber: slot.slotNumber },
  });

  const data = {
    zoneId,
    slotNumber: slot.slotNumber,
    lat: slot.lat,
    lon: slot.lon,
    address: slot.address,
    slotType: slot.slotType,
    sensorId: slot.sensorId || null,
    status: 'available',
    price: slot.price,
    description: slot.description,
    amenities: JSON.stringify(slot.amenities),
    photos: JSON.stringify([
      'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800',
      'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=800',
    ]),
    rating: slot.rating,
    ownerId,
    isActive: true,
  };

  if (!existingSlot) {
    const created = await prisma.parkingSlot.create({ data });
    return { slot: created, action: 'created' };
  }

  const updated = await prisma.parkingSlot.update({
    where: { id: existingSlot.id },
    data,
  });
  return { slot: updated, action: 'updated' };
}

async function main() {
  console.log('Adding parking slots near ' + CENTER.lat + ', ' + CENTER.lon + '...');

  const hosts = await findOrCreateHost();
  const zone = await findOrCreateZone();
  const results = [];

  for (const [index, slot] of nearbySlots.entries()) {
    const owner = hosts[index % hosts.length];
    const result = await upsertSlot(slot, zone.id, owner.id);
    results.push(result);
    console.log((result.action === 'created' ? '+' : '~') + ' ' + slot.slotNumber + ': ' + slot.address);
  }

  const createdCount = results.filter((result) => result.action === 'created').length;
  const updatedCount = results.filter((result) => result.action === 'updated').length;

  console.log('\nDone. ' + createdCount + ' created, ' + updatedCount + ' updated.');
  console.log('Zone: ' + zone.name + ' (ID ' + zone.id + ')');
  console.log('Search tip: lat=' + CENTER.lat + '&lon=' + CENTER.lon + '&radius=2');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
