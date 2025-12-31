const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding parking slots in Makati City (14.5547, 121.0244)...');

  // Get existing hosts
  const hosts = await prisma.user.findMany({
    where: { role: 'host' },
  });

  if (hosts.length === 0) {
    console.error('❌ No hosts found. Please run the main seed script first.');
    process.exit(1);
  }

  console.log(`✅ Found ${hosts.length} hosts`);

  // Create a zone for Makati CBD
  const makatiZone = await prisma.zone.create({
    data: {
      name: 'Makati Central Business District',
      type: 'commercial',
      address: 'Ayala Avenue, Makati City',
      city: 'Makati',
      geofencePolygon: JSON.stringify({
        type: 'Polygon',
        coordinates: [
          [
            [121.0194, 14.5597],
            [121.0294, 14.5597],
            [121.0294, 14.5497],
            [121.0194, 14.5497],
            [121.0194, 14.5597],
          ],
        ],
      }),
      centerLat: 14.5547,
      centerLon: 121.0244,
      radiusMeters: 1000,
      totalCapacity: 500,
      pricePerHour: 60,
      operatingHours: JSON.stringify({ daily: '0:00-24:00' }),
    },
  });

  console.log(`✅ Created zone: ${makatiZone.name}`);

  // Create parking slots widely distributed across Makati City
  const makatiSlots = [
    // North Makati - Rockwell area
    {
      lat: 14.5620,
      lon: 121.0350,
      address: 'Rockwell Drive, Rockwell Center',
      slotType: 'commercial_iot',
      slotNumber: 'ROC-A101',
      sensorId: 'sensor-rockwell-a101',
      price: 95,
      description: 'Premium parking at Rockwell Center',
      amenities: ['covered', 'security', 'cctv', 'ev_charging', 'valet'],
      rating: 4.9,
    },
    // Far South - Century City Mall area
    {
      lat: 14.5420,
      lon: 121.0510,
      address: 'Kalayaan Avenue, Century City',
      slotType: 'commercial_manual',
      slotNumber: 'CEN-B205',
      price: 65,
      description: 'Mall parking near Century City',
      amenities: ['covered', 'security', 'cctv', 'restroom'],
      rating: 4.6,
    },
    // Central West - Ayala Avenue
    {
      lat: 14.5547,
      lon: 121.0200,
      address: 'Ayala Avenue corner EDSA',
      slotType: 'commercial_iot',
      slotNumber: 'AYA-C301',
      sensorId: 'sensor-ayala-c301',
      price: 75,
      description: 'Smart parking near business towers',
      amenities: ['covered', 'security', 'cctv', 'mobile_app'],
      rating: 4.7,
    },
    // Far East - Forbes Park entrance
    {
      lat: 14.5480,
      lon: 121.0420,
      address: 'McKinley Road, Forbes Park',
      slotType: 'roadside_qr',
      slotNumber: null,
      price: 50,
      description: 'Street parking near Forbes Park',
      amenities: ['outdoor', 'lighting', 'quiet_area'],
      rating: 4.2,
    },
    // North Central - Gil Puyat / Buendia
    {
      lat: 14.5600,
      lon: 121.0180,
      address: 'Gil Puyat Avenue (Buendia)',
      slotType: 'commercial_manual',
      slotNumber: 'GIL-D401',
      price: 70,
      description: 'Parking near shopping centers',
      amenities: ['covered', 'security', 'cctv', 'wide_slot'],
      rating: 4.5,
    },
    // Southwest - Poblacion
    {
      lat: 14.5500,
      lon: 121.0150,
      address: 'Don Pedro Street, Poblacion',
      slotType: 'roadside_qr',
      slotNumber: null,
      price: 45,
      description: 'Affordable street parking in Poblacion',
      amenities: ['outdoor', 'lighting', 'nightlife'],
      rating: 4.0,
    },
    // Southeast - Chino Roces
    {
      lat: 14.5450,
      lon: 121.0300,
      address: 'Chino Roces Avenue',
      slotType: 'commercial_manual',
      slotNumber: 'CHI-E201',
      price: 55,
      description: 'Parking in commercial district',
      amenities: ['covered', 'security', 'lighting'],
      rating: 4.3,
    },
    // Northeast - Salcedo Village
    {
      lat: 14.5580,
      lon: 121.0280,
      address: 'Salcedo Street, Salcedo Village',
      slotType: 'commercial_iot',
      slotNumber: 'SAL-F501',
      sensorId: 'sensor-salcedo-f501',
      price: 85,
      description: 'Premium parking in upscale area',
      amenities: ['covered', 'security', 'cctv', 'ev_charging', 'gated'],
      rating: 4.8,
    },
    // West - Pasay Road
    {
      lat: 14.5520,
      lon: 121.0100,
      address: 'Pasay Road, Makati',
      slotType: 'commercial_manual',
      slotNumber: 'PAS-G601',
      price: 70,
      description: 'Parking near transport hubs',
      amenities: ['covered', 'security', 'cctv'],
      rating: 4.6,
    },
    // Far North - Guadalupe area
    {
      lat: 14.5680,
      lon: 121.0440,
      address: 'EDSA Guadalupe, Makati',
      slotType: 'commercial_manual',
      slotNumber: 'GUA-H701',
      price: 60,
      description: 'Parking near MRT station',
      amenities: ['covered', 'security', 'nearby_mrt'],
      rating: 4.4,
    },
    // South Central - Legaspi Village
    {
      lat: 14.5510,
      lon: 121.0220,
      address: 'Rufino Street, Legaspi Village',
      slotType: 'roadside_qr',
      slotNumber: null,
      price: 40,
      description: 'Street parking near parks',
      amenities: ['outdoor', 'lighting', 'quiet_area'],
      rating: 3.9,
    },
    // Central - Greenbelt
    {
      lat: 14.5547,
      lon: 121.0244,
      address: 'Esperanza Street, near Greenbelt',
      slotType: 'commercial_iot',
      slotNumber: 'GRN-I801',
      sensorId: 'sensor-greenbelt-i801',
      price: 90,
      description: 'Premium parking near Greenbelt Mall',
      amenities: ['covered', 'security', 'cctv', 'restroom', 'nearby_mall'],
      rating: 4.9,
    },
  ];

  // Create slots with distributed hosts
  const createdSlots = await Promise.all(
    makatiSlots.map((slot, index) => {
      const hostIdx = index % hosts.length;
      return prisma.parkingSlot.create({
        data: {
          zoneId: makatiZone.id,
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

  console.log(`✅ Created ${createdSlots.length} parking slots in Makati City`);

  console.log('🎉 Seeding completed successfully!');
  console.log(`
📊 Summary:
- Zone: ${makatiZone.name}
- Parking Slots: ${createdSlots.length} (within ~1km of Makati CBD)
- Hosts: ${hosts.length} (distributed across slots)

📍 Location Details:
- Center: 14.5547, 121.0244 (Makati City)
- Radius: ~1km
- Price Range: ₱40-90 per hour
- Types: Commercial Manual, Commercial IoT, Roadside QR
- Areas: Ayala Avenue, Poblacion, Salcedo Village, Legaspi Village, Greenbelt

💡 Tip: Search with lat=14.5547&lon=121.0244&radius=10 to see all Makati slots
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
