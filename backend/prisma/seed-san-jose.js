const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding parking slots in San Jose del Monte, Bulacan...');

  // Get existing hosts
  const hosts = await prisma.user.findMany({
    where: { role: 'host' },
  });

  if (hosts.length === 0) {
    console.error('❌ No hosts found. Please run the main seed script first.');
    process.exit(1);
  }

  console.log(`✅ Found ${hosts.length} hosts`);

  // Create a zone for San Jose del Monte
  const sjdmZone = await prisma.zone.create({
    data: {
      name: 'San Jose del Monte City Center',
      type: 'commercial',
      address: 'Quirino Highway, San Jose del Monte',
      city: 'San Jose del Monte',
      geofencePolygon: JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [121.0395, 14.8195],
            [121.0595, 14.8195],
            [121.0595, 14.7995],
            [121.0395, 14.7995],
            [121.0395, 14.8195],
          ],
        ],
      }),
      centerLat: 14.8095,
      centerLon: 121.0495,
      radiusMeters: 1000,
      totalCapacity: 400,
      pricePerHour: 30,
      operatingHours: JSON.stringify({ daily: '6:00-24:00' }),
    },
  });

  console.log(`✅ Created zone: ${sjdmZone.name}`);

  // Create parking slots in San Jose del Monte
  const sjdmSlots = [
    // Quirino Highway area
    {
      lat: 14.8095,
      lon: 121.0495,
      address: 'Quirino Highway, near Gracepark Subdivision',
      slotType: 'commercial_manual',
      slotNumber: 'SJDM-A101',
      price: 30,
      description: 'Covered parking near commercial complex',
      amenities: ['covered', 'security', 'cctv', 'restroom'],
      rating: 4.5,
    },
    {
      lat: 14.8100,
      lon: 121.0500,
      address: 'Quirino Highway, SM City San Jose del Monte',
      slotType: 'commercial_iot',
      slotNumber: 'SJDM-B205',
      sensorId: 'sensor-sjdm-b205',
      price: 35,
      description: 'Premium mall parking with EV charging',
      amenities: ['covered', 'security', 'cctv', 'ev_charging', 'restroom'],
      rating: 4.8,
    },
    {
      lat: 14.8090,
      lon: 121.0490,
      address: 'Quirino Highway, City Hall vicinity',
      slotType: 'roadside_qr',
      slotNumber: null,
      price: 20,
      description: 'Street parking near government offices',
      amenities: ['outdoor', 'lighting', 'nearby_shops'],
      rating: 4.0,
    },
    // Tungkong Mangga area
    {
      lat: 14.8150,
      lon: 121.0450,
      address: 'Tungkong Mangga, San Jose del Monte',
      slotType: 'commercial_manual',
      slotNumber: 'SJDM-C301',
      price: 28,
      description: 'Open parking lot near residential area',
      amenities: ['outdoor', 'security', 'lighting'],
      rating: 4.3,
    },
    {
      lat: 14.8140,
      lon: 121.0460,
      address: 'Minuyan Proper, San Jose del Monte',
      slotType: 'roadside_qr',
      slotNumber: null,
      price: 18,
      description: 'Residential street parking',
      amenities: ['outdoor', 'lighting', 'quiet_area'],
      rating: 3.9,
    },
    // Ciudad de San Jose area
    {
      lat: 14.8050,
      lon: 121.0520,
      address: 'Ciudad de San Jose, San Jose del Monte',
      slotType: 'commercial_manual',
      slotNumber: 'SJDM-D150',
      price: 32,
      description: 'Subdivision parking near amenities',
      amenities: ['covered', 'security', 'cctv', 'gated'],
      rating: 4.6,
    },
    {
      lat: 14.8060,
      lon: 121.0510,
      address: 'Gaya-Gaya, San Jose del Monte',
      slotType: 'commercial_iot',
      slotNumber: 'SJDM-E201',
      sensorId: 'sensor-sjdm-e201',
      price: 35,
      description: 'Smart parking with real-time availability',
      amenities: ['covered', 'security', 'cctv', 'mobile_app'],
      rating: 4.7,
    },
    // Sapang Palay area
    {
      lat: 14.8200,
      lon: 121.0400,
      address: 'Sapang Palay Proper, San Jose del Monte',
      slotType: 'roadside_qr',
      slotNumber: null,
      price: 15,
      description: 'Budget street parking near public market',
      amenities: ['outdoor', 'lighting', 'nearby_shops'],
      rating: 3.8,
    },
    {
      lat: 14.8180,
      lon: 121.0420,
      address: 'Bayan-Bayanan, San Jose del Monte',
      slotType: 'commercial_manual',
      slotNumber: 'SJDM-F401',
      price: 25,
      description: 'Community parking near barangay hall',
      amenities: ['outdoor', 'security', 'wide_slot'],
      rating: 4.2,
    },
    // Kaybanban area
    {
      lat: 14.8020,
      lon: 121.0480,
      address: 'Kaybanban, San Jose del Monte',
      slotType: 'commercial_manual',
      slotNumber: 'SJDM-G101',
      price: 30,
      description: 'Covered parking near commercial strip',
      amenities: ['covered', 'security', 'cctv'],
      rating: 4.4,
    },
    {
      lat: 14.8030,
      lon: 121.0470,
      address: 'Francisco Homes, San Jose del Monte',
      slotType: 'roadside_qr',
      slotNumber: null,
      price: 20,
      description: 'Subdivision street parking',
      amenities: ['outdoor', 'lighting', 'gated'],
      rating: 4.1,
    },
    // Additional commercial slots
    {
      lat: 14.8110,
      lon: 121.0505,
      address: 'Poblacion, San Jose del Monte',
      slotType: 'commercial_iot',
      slotNumber: 'SJDM-H301',
      sensorId: 'sensor-sjdm-h301',
      price: 38,
      description: 'Premium parking in city center',
      amenities: ['covered', 'security', 'cctv', 'valet', 'restroom'],
      rating: 4.9,
    },
    {
      lat: 14.8070,
      lon: 121.0485,
      address: 'Sta. Cruz, San Jose del Monte',
      slotType: 'commercial_manual',
      slotNumber: 'SJDM-I102',
      price: 28,
      description: 'Open lot near church and schools',
      amenities: ['outdoor', 'security', 'lighting', 'nearby_shops'],
      rating: 4.3,
    },
    {
      lat: 14.8120,
      lon: 121.0440,
      address: 'Paradise III, San Jose del Monte',
      slotType: 'roadside_qr',
      slotNumber: null,
      price: 22,
      description: 'Residential area parking',
      amenities: ['outdoor', 'lighting', 'quiet_area'],
      rating: 4.0,
    },
  ];

  // Create slots with distributed hosts
  const createdSlots = await Promise.all(
    sjdmSlots.map((slot, index) => {
      const hostIdx = index % hosts.length;
      return prisma.parkingSlot.create({
        data: {
          zoneId: sjdmZone.id,
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

  console.log(`✅ Created ${createdSlots.length} parking slots in San Jose del Monte`);

  console.log('🎉 Seeding completed successfully!');
  console.log(`
📊 Summary:
- Zone: ${sjdmZone.name}
- Parking Slots: ${createdSlots.length} (throughout San Jose del Monte City)
- Hosts: ${hosts.length} (distributed across slots)

📍 Location Details:
- Center: 14.8095, 121.0495 (San Jose del Monte, Bulacan)
- Areas covered: Quirino Highway, Tungkong Mangga, Ciudad de San Jose,
  Sapang Palay, Kaybanban, Francisco Homes, and more
- Price Range: ₱15-38 per hour
- Types: Commercial Manual, Commercial IoT, Roadside QR

💡 Tip: Search with lat=14.8095&lon=121.0495&radius=5 to see all SJDM slots
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
