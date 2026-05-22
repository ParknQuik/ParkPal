/**
 * Add Analytics Zones (Non-Destructive)
 * 
 * Upserts analytics zones into the database without deleting any existing data.
 * Safe to run multiple times - will only create zones that don't exist.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const analyticsZones = [
  {
    name: 'SM Mall of Asia Complex',
    type: 'commercial',
    address: 'Seaside Blvd, Pasay',
    city: 'Pasay',
    geofencePolygon: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[120.9819, 14.5337], [120.9869, 14.5337], [120.9869, 14.5287], [120.9819, 14.5287], [120.9819, 14.5337]]]
    }),
    centerLat: 14.5312,
    centerLon: 120.9844,
    radiusMeters: 500,
    totalCapacity: 500,
    pricePerHour: 40,
    operatingHours: JSON.stringify({ daily: '6:00-24:00' }),
  },
  {
    name: 'Ayala Center Makati',
    type: 'commercial',
    address: 'Ayala Avenue, Makati',
    city: 'Makati',
    geofencePolygon: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[121.0267, 14.5532], [121.0317, 14.5532], [121.0317, 14.5482], [121.0267, 14.5482], [121.0267, 14.5532]]]
    }),
    centerLat: 14.5507,
    centerLon: 121.0292,
    radiusMeters: 400,
    totalCapacity: 600,
    pricePerHour: 50,
    operatingHours: JSON.stringify({ daily: '7:00-23:00' }),
  },
  {
    name: 'UP Diliman Campus',
    type: 'roadside',
    address: 'University Avenue, Quezon City',
    city: 'Quezon City',
    geofencePolygon: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[121.0623, 14.6573], [121.0673, 14.6573], [121.0673, 14.6523], [121.0623, 14.6523], [121.0623, 14.6573]]]
    }),
    centerLat: 14.6548,
    centerLon: 121.0648,
    radiusMeters: 600,
    totalCapacity: 200,
    pricePerHour: 20,
    operatingHours: JSON.stringify({ daily: '24/7' }),
  },
  {
    name: 'BGC High Street',
    type: 'commercial',
    address: '9th Avenue, Taguig',
    city: 'Taguig',
    geofencePolygon: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[121.0433, 14.5533], [121.0483, 14.5533], [121.0483, 14.5483], [121.0433, 14.5483], [121.0433, 14.5533]]]
    }),
    centerLat: 14.5508,
    centerLon: 121.0458,
    radiusMeters: 450,
    totalCapacity: 400,
    pricePerHour: 60,
    operatingHours: JSON.stringify({ daily: '7:00-23:00' }),
  },
  {
    name: 'Manila Ocean Park Area',
    type: 'roadside',
    address: 'Roxas Blvd, Manila',
    city: 'Manila',
    geofencePolygon: JSON.stringify({
      type: 'Polygon',
      coordinates: [[[120.9852, 14.5802], [120.9902, 14.5802], [120.9902, 14.5752], [120.9852, 14.5752], [120.9852, 14.5802]]]
    }),
    centerLat: 14.5777,
    centerLon: 120.9877,
    radiusMeters: 300,
    totalCapacity: 150,
    pricePerHour: 30,
    operatingHours: JSON.stringify({ daily: '24/7' }),
  },
];

async function main() {
  console.log('🌱 Adding analytics zones (non-destructive)...');
  
  let created = 0;
  let skipped = 0;
  
  for (const zone of analyticsZones) {
    const existing = await prisma.zone.findFirst({
      where: { name: zone.name }
    });
    
    if (existing) {
      console.log(`⏭️  "${zone.name}" already exists, skipping`);
      skipped++;
    } else {
      await prisma.zone.create({ data: zone });
      console.log(`✅ Created zone: "${zone.name}"`);
      created++;
    }
  }
  
  console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
