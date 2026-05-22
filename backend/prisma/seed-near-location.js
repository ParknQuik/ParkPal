const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding parking slots near your location (14.8439, 121.0369)...');

  // Get existing hosts
  const hosts = await prisma.user.findMany({
    where: { role: 'host' },
  });

  if (hosts.length === 0) {
    console.error('❌ No hosts found. Please run the main seed script first.');
    process.exit(1);
  }

  console.log(`✅ Found ${hosts.length} hosts`);

  // Create a zone for Antipolo/Cainta area
  const antipoloZone = await prisma.zone.create({
    data: {
      name: 'Antipolo/Cainta Commercial Area',
      type: 'commercial',
      address: 'Sumulong Highway, Antipolo',
      city: 'Antipolo',
      geofencePolygon: JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [121.0319, 14.8489],
            [121.0419, 14.8489],
            [121.0419, 14.8389],
            [121.0319, 14.8389],
            [121.0319, 14.8489],
          ],
        ],
      }),
      centerLat: 14.8439,
      centerLon: 121.0369,
      radiusMeters: 800,
      totalCapacity: 300,
      pricePerHour: 35,
      operatingHours: JSON.stringify({ daily: '6:00-24:00' }),
    },
  });

  console.log(`✅ Created zone: ${antipoloZone.name}`);

  // Create parking slots around your location
  const nearbySlots = [
    // Very close to your location
    {
      lat: 14.8442,
      lon: 121.0372,
      address: 'Sumulong Highway, near Sta. Lucia East Mall',
      slotType: 'commercial_manual',
      slotNumber: 'SLE-A101',
      price: 35,
      description: 'Covered parking near mall entrance',
      amenities: ['covered', 'security', 'cctv', 'restroom'],
      rating: 4.6,
    },
    {
      lat: 14.8445,
      lon: 121.0365,
      address: 'Ortigas Avenue Extension, Cainta',
      slotType: 'commercial_iot',
      slotNumber: 'CAI-B205',
      sensorId: 'sensor-cainta-b205',
      price: 40,
      description: 'Premium parking with EV charging',
      amenities: ['covered', 'security', 'cctv', 'ev_charging'],
      rating: 4.8,
    },
    {
      lat: 14.8435,
      lon: 121.0375,
      address: 'Felix Avenue, Cainta',
      slotType: 'roadside_qr',
      slotNumber: null,
      price: 25,
      description: 'Street parking near residential area',
      amenities: ['outdoor', 'lighting'],
      rating: 4.0,
    },
    // Slightly further (within 500m)
    {
      lat: 14.8450,
      lon: 121.0380,
      address: 'Marcos Highway, Antipolo',
      slotType: 'commercial_manual',
      slotNumber: 'ANT-C301',
      price: 30,
      description: 'Open parking lot near restaurants',
      amenities: ['outdoor', 'security', 'lighting'],
      rating: 4.3,
    },
    {
      lat: 14.8430,
      lon: 121.0360,
      address: 'A. Bonifacio Avenue, Cainta',
      slotType: 'roadside_qr',
      slotNumber: null,
      price: 20,
      description: 'Residential street parking',
      amenities: ['outdoor', 'lighting', 'quiet_area'],
      rating: 3.9,
    },
    {
      lat: 14.8438,
      lon: 121.0385,
      address: 'Circumferential Road, Antipolo',
      slotType: 'commercial_manual',
      slotNumber: 'ANT-D150',
      price: 35,
      description: 'Covered parking near commercial center',
      amenities: ['covered', 'security', 'cctv'],
      rating: 4.5,
    },
    {
      lat: 14.8425,
      lon: 121.0370,
      address: 'Imelda Avenue, Cainta',
      slotType: 'commercial_iot',
      slotNumber: 'CAI-E201',
      sensorId: 'sensor-cainta-e201',
      price: 38,
      description: 'Smart parking with real-time availability',
      amenities: ['covered', 'security', 'cctv', 'mobile_app'],
      rating: 4.7,
    },
    {
      lat: 14.8455,
      lon: 121.0375,
      address: 'Manila East Road, Antipolo',
      slotType: 'roadside_qr',
      slotNumber: null,
      price: 22,
      description: 'Street parking near public market',
      amenities: ['outdoor', 'lighting', 'nearby_shops'],
      rating: 4.1,
    },
    // Additional slots within 1km radius
    {
      lat: 14.8460,
      lon: 121.0365,
      address: 'Taktak Road, Antipolo',
      slotType: 'commercial_manual',
      slotNumber: 'ANT-F401',
      price: 32,
      description: 'Spacious parking near tourist spots',
      amenities: ['outdoor', 'security', 'wide_slot'],
      rating: 4.4,
    },
    {
      lat: 14.8420,
      lon: 121.0380,
      address: 'P. Burgos Street, Cainta',
      slotType: 'roadside_qr',
      slotNumber: null,
      price: 18,
      description: 'Budget-friendly street parking',
      amenities: ['outdoor', 'lighting'],
      rating: 3.8,
    },
    {
      lat: 14.8448,
      lon: 121.0358,
      address: 'Brookside Lane, Cainta',
      slotType: 'commercial_manual',
      slotNumber: 'BRK-G101',
      price: 30,
      description: 'Residential complex parking',
      amenities: ['covered', 'security', 'gated'],
      rating: 4.5,
    },
    {
      lat: 14.8432,
      lon: 121.0390,
      address: 'Sampaloc Road, Antipolo',
      slotType: 'commercial_iot',
      slotNumber: 'SAM-H301',
      sensorId: 'sensor-sampaloc-h301',
      price: 42,
      description: 'Premium parking with valet service',
      amenities: ['covered', 'security', 'cctv', 'valet'],
      rating: 4.9,
    },
  ];

  // Create slots with distributed hosts
  const createdSlots = await Promise.all(
    nearbySlots.map((slot, index) => {
      const hostIdx = index % hosts.length;
      return prisma.parkingSlot.create({
        data: {
          zoneId: antipoloZone.id,
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
            `https://example.com/photos/${slot.slotNumber || 'roadside'}-1.jpg`,
            `https://example.com/photos/${slot.slotNumber || 'roadside'}-2.jpg`,
          ]),
          rating: slot.rating,
          ownerId: hosts[hostIdx].id,
        },
      });
    })
  );

  console.log(`✅ Created ${createdSlots.length} parking slots near your location`);

  console.log('🎉 Seeding completed successfully!');
  console.log(`
📊 Summary:
- Zone: ${antipoloZone.name}
- Parking Slots: ${createdSlots.length} (within ~1km of 14.8439, 121.0369)
- Hosts: ${hosts.length} (distributed across slots)

📍 Location Details:
- Center: 14.8439, 121.0369 (Antipolo/Cainta area)
- Radius: ~800m
- Price Range: ₱18-42 per hour
- Types: Commercial Manual, Commercial IoT, Roadside QR

💡 Tip: Search with lat=14.8439&lon=121.0369&radius=2 to see all nearby slots
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
