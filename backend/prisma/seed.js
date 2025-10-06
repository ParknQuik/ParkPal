const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (in development only)
  await prisma.review.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.parkingSession.deleteMany();
  await prisma.sensorEvent.deleteMany();
  await prisma.parkingSlot.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleared existing data');

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    // Drivers
    prisma.user.create({
      data: {
        name: 'Juan Dela Cruz',
        email: 'juan@example.com',
        password: hashedPassword,
        role: 'driver',
        phone: '+639171234567',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Maria Santos',
        email: 'maria@example.com',
        password: hashedPassword,
        role: 'driver',
        phone: '+639181234567',
      },
    }),
    // Hosts
    prisma.user.create({
      data: {
        name: 'Pedro Reyes',
        email: 'pedro@example.com',
        password: hashedPassword,
        role: 'host',
        phone: '+639191234567',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Ana Garcia',
        email: 'ana@example.com',
        password: hashedPassword,
        role: 'host',
        phone: '+639201234567',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Carlos Mendoza',
        email: 'carlos@example.com',
        password: hashedPassword,
        role: 'host',
        phone: '+639211234567',
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} test users`);

  // Create zones
  const zones = await Promise.all([
    prisma.zone.create({
      data: {
        name: 'SM Mall of Asia Complex',
        type: 'commercial',
        address: 'Seaside Blvd, Pasay',
        city: 'Pasay',
        geofencePolygon: JSON.stringify({
          type: 'Polygon',
          coordinates: [
            [
              [120.9819, 14.5337],
              [120.9869, 14.5337],
              [120.9869, 14.5287],
              [120.9819, 14.5287],
              [120.9819, 14.5337],
            ],
          ],
        }),
        centerLat: 14.5312,
        centerLon: 120.9844,
        radiusMeters: 500,
        totalCapacity: 500,
        pricePerHour: 40,
        operatingHours: JSON.stringify({ daily: '6:00-24:00' }),
      },
    }),
    prisma.zone.create({
      data: {
        name: 'Ayala Center Makati',
        type: 'commercial',
        address: 'Ayala Avenue, Makati',
        city: 'Makati',
        geofencePolygon: JSON.stringify({
          type: 'Polygon',
          coordinates: [
            [
              [121.0267, 14.5532],
              [121.0317, 14.5532],
              [121.0317, 14.5482],
              [121.0267, 14.5482],
              [121.0267, 14.5532],
            ],
          ],
        }),
        centerLat: 14.5507,
        centerLon: 121.0292,
        radiusMeters: 400,
        totalCapacity: 600,
        pricePerHour: 50,
        operatingHours: JSON.stringify({ daily: '7:00-23:00' }),
      },
    }),
    prisma.zone.create({
      data: {
        name: 'UP Diliman Campus',
        type: 'roadside',
        address: 'University Avenue, Quezon City',
        city: 'Quezon City',
        geofencePolygon: JSON.stringify({
          type: 'Polygon',
          coordinates: [
            [
              [121.0623, 14.6573],
              [121.0673, 14.6573],
              [121.0673, 14.6523],
              [121.0623, 14.6523],
              [121.0623, 14.6573],
            ],
          ],
        }),
        centerLat: 14.6548,
        centerLon: 121.0648,
        radiusMeters: 600,
        totalCapacity: 200,
        pricePerHour: 20,
        operatingHours: JSON.stringify({ daily: '24/7' }),
      },
    }),
    prisma.zone.create({
      data: {
        name: 'BGC High Street',
        type: 'commercial',
        address: '9th Avenue, Taguig',
        city: 'Taguig',
        geofencePolygon: JSON.stringify({
          type: 'Polygon',
          coordinates: [
            [
              [121.0433, 14.5533],
              [121.0483, 14.5533],
              [121.0483, 14.5483],
              [121.0433, 14.5483],
              [121.0433, 14.5533],
            ],
          ],
        }),
        centerLat: 14.5508,
        centerLon: 121.0458,
        radiusMeters: 350,
        totalCapacity: 400,
        pricePerHour: 60,
        operatingHours: JSON.stringify({ daily: '6:00-24:00' }),
      },
    }),
    prisma.zone.create({
      data: {
        name: 'Manila Ocean Park Area',
        type: 'roadside',
        address: 'Roxas Boulevard, Manila',
        city: 'Manila',
        geofencePolygon: JSON.stringify({
          type: 'Polygon',
          coordinates: [
            [
              [120.9715, 14.5755],
              [120.9765, 14.5755],
              [120.9765, 14.5705],
              [120.9715, 14.5705],
              [120.9715, 14.5755],
            ],
          ],
        }),
        centerLat: 14.573,
        centerLon: 120.974,
        radiusMeters: 300,
        totalCapacity: 150,
        pricePerHour: 30,
        operatingHours: JSON.stringify({ daily: '24/7' }),
      },
    }),
  ]);

  console.log(`✅ Created ${zones.length} zones`);

  // Create parking slots
  const slots = await Promise.all([
    // Commercial slots in SM Mall of Asia
    prisma.parkingSlot.create({
      data: {
        zoneId: zones[0].id,
        slotNumber: 'A-101',
        lat: 14.5315,
        lon: 120.9845,
        address: 'SM Mall of Asia, Level 1, Section A',
        slotType: 'commercial_manual',
        status: 'available',
        price: 40,
        description: 'Covered parking near main entrance',
        amenities: JSON.stringify(['covered', 'security', 'cctv', 'restroom']),
        photos: JSON.stringify([
          'https://example.com/photos/moa-a101-1.jpg',
          'https://example.com/photos/moa-a101-2.jpg',
        ]),
        rating: 4.5,
        ownerId: users[2].id, // Pedro
      },
    }),
    prisma.parkingSlot.create({
      data: {
        zoneId: zones[0].id,
        slotNumber: 'B-205',
        lat: 14.5318,
        lon: 120.9848,
        address: 'SM Mall of Asia, Level 2, Section B',
        slotType: 'commercial_iot',
        sensorId: 'sensor-moa-b205',
        status: 'available',
        price: 45,
        description: 'Premium covered parking with EV charging',
        amenities: JSON.stringify(['covered', 'security', 'cctv', 'ev_charging']),
        photos: JSON.stringify(['https://example.com/photos/moa-b205.jpg']),
        rating: 4.8,
        ownerId: users[2].id,
      },
    }),
    // Commercial slots in Ayala Makati
    prisma.parkingSlot.create({
      data: {
        zoneId: zones[1].id,
        slotNumber: 'C-150',
        lat: 14.551,
        lon: 121.029,
        address: 'Ayala Center, Parking C, Level 1',
        slotType: 'commercial_manual',
        status: 'available',
        price: 50,
        description: 'Convenient spot near Glorietta entrance',
        amenities: JSON.stringify(['covered', 'security', 'cctv', 'restroom', 'elevator']),
        photos: JSON.stringify(['https://example.com/photos/ayala-c150.jpg']),
        rating: 4.6,
        ownerId: users[3].id, // Ana
      },
    }),
    prisma.parkingSlot.create({
      data: {
        zoneId: zones[1].id,
        slotNumber: 'D-225',
        lat: 14.5512,
        lon: 121.0295,
        address: 'Ayala Center, Parking D, Level 2',
        slotType: 'commercial_iot',
        sensorId: 'sensor-ayala-d225',
        status: 'available',
        price: 55,
        description: 'Spacious slot for SUVs, near escalator',
        amenities: JSON.stringify(['covered', 'security', 'cctv', 'wide_slot']),
        photos: JSON.stringify(['https://example.com/photos/ayala-d225.jpg']),
        rating: 4.7,
        ownerId: users[3].id,
      },
    }),
    // Roadside QR slots in UP Diliman
    prisma.parkingSlot.create({
      data: {
        zoneId: zones[2].id,
        slotNumber: null,
        lat: 14.655,
        lon: 121.065,
        address: 'University Avenue, UP Diliman, near AS Building',
        slotType: 'roadside_qr',
        status: 'available',
        price: 20,
        description: 'Street parking near Academic Oval',
        amenities: JSON.stringify(['outdoor', 'lighting']),
        photos: JSON.stringify(['https://example.com/photos/up-street-1.jpg']),
        rating: 4.0,
        ownerId: users[4].id, // Carlos
      },
    }),
    prisma.parkingSlot.create({
      data: {
        zoneId: zones[2].id,
        slotNumber: null,
        lat: 14.6555,
        lon: 121.0655,
        address: 'University Avenue, UP Diliman, near Shopping Center',
        slotType: 'roadside_qr',
        status: 'available',
        price: 25,
        description: 'Covered residential parking, shared driveway',
        amenities: JSON.stringify(['covered', 'lighting', 'security']),
        photos: JSON.stringify(['https://example.com/photos/up-street-2.jpg']),
        rating: 4.3,
        ownerId: users[4].id,
      },
    }),
    // BGC High Street slots
    prisma.parkingSlot.create({
      data: {
        zoneId: zones[3].id,
        slotNumber: 'BGC-E301',
        lat: 14.551,
        lon: 121.046,
        address: 'One Bonifacio High Street, Level 3',
        slotType: 'commercial_manual',
        status: 'available',
        price: 60,
        description: 'Premium parking in BGC, near restaurants',
        amenities: JSON.stringify(['covered', 'security', 'cctv', 'valet', 'restroom']),
        photos: JSON.stringify(['https://example.com/photos/bgc-e301.jpg']),
        rating: 4.9,
        ownerId: users[2].id,
      },
    }),
    // Manila Ocean Park roadside
    prisma.parkingSlot.create({
      data: {
        zoneId: zones[4].id,
        slotNumber: null,
        lat: 14.5732,
        lon: 120.9742,
        address: 'Roxas Boulevard, near Manila Ocean Park entrance',
        slotType: 'roadside_qr',
        status: 'available',
        price: 30,
        description: 'Street parking with bay view',
        amenities: JSON.stringify(['outdoor', 'lighting', 'bay_view']),
        photos: JSON.stringify(['https://example.com/photos/manila-ocean-1.jpg']),
        rating: 4.2,
        ownerId: users[3].id,
      },
    }),
    // Additional mixed slots (total 20)
    ...Array.from({ length: 12 }, (_, i) => {
      const zoneIdx = i % 5;
      const hostIdx = (i % 3) + 2;
      const isRoadside = i % 3 === 0;

      return prisma.parkingSlot.create({
        data: {
          zoneId: zones[zoneIdx].id,
          slotNumber: isRoadside ? null : `TEST-${i + 1}`,
          lat: zones[zoneIdx].centerLat + (Math.random() - 0.5) * 0.002,
          lon: zones[zoneIdx].centerLon + (Math.random() - 0.5) * 0.002,
          address: `${zones[zoneIdx].address}, Test Slot ${i + 1}`,
          slotType: isRoadside ? 'roadside_qr' : 'commercial_manual',
          status: 'available',
          price: zones[zoneIdx].pricePerHour || 30,
          description: `Test parking slot ${i + 1}`,
          amenities: JSON.stringify(
            isRoadside
              ? ['outdoor', 'lighting']
              : ['covered', 'security', 'cctv']
          ),
          photos: JSON.stringify([`https://example.com/photos/test-${i + 1}.jpg`]),
          rating: 3.5 + Math.random() * 1.5,
          ownerId: users[hostIdx].id,
        },
      });
    }),
  ]);

  console.log(`✅ Created ${slots.length} parking slots`);

  console.log('🎉 Database seeding completed successfully!');
  console.log(`
📊 Summary:
- Users: ${users.length} (2 drivers, 3 hosts)
- Zones: ${zones.length} (Manila, Quezon City, Makati, Taguig, Pasay)
- Parking Slots: ${slots.length} (various types)

🔑 Test Credentials:
Driver 1: juan@example.com / password123
Driver 2: maria@example.com / password123
Host 1: pedro@example.com / password123
Host 2: ana@example.com / password123
Host 3: carlos@example.com / password123
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
