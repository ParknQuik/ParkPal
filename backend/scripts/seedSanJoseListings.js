const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

// San Jose del Monte, Bulacan coordinates: 14.8136° N, 121.0453° E
// Sample locations around the city

const sampleListings = [
  {
    address: 'Sapang Palay, San Jose del Monte, Bulacan',
    lat: 14.8136,
    lon: 121.0453,
    price: 25,
    description: 'Covered parking near market. Safe and well-lit area with CCTV.',
    slotType: 'outdoor',
    amenities: ['covered', 'security', 'cctv', 'lighting'],
    photos: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400'],
  },
  {
    address: 'Gaya-Gaya, San Jose del Monte, Bulacan',
    lat: 14.8245,
    lon: 121.0567,
    price: 30,
    description: 'Secure garage parking in residential area. 24/7 access.',
    slotType: 'garage',
    amenities: ['covered', 'security', 'accessible', 'lighting'],
    photos: ['https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400'],
  },
  {
    address: 'Tungkong Mangga, San Jose del Monte, Bulacan',
    lat: 14.7989,
    lon: 121.0389,
    price: 20,
    description: 'Outdoor parking space near commercial area. Good for daily parking.',
    slotType: 'outdoor',
    amenities: ['lighting', 'accessible'],
    photos: ['https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400'],
  },
  {
    address: 'Dulong Bayan, San Jose del Monte, Bulacan',
    lat: 14.8334,
    lon: 121.0623,
    price: 35,
    description: 'Premium covered parking with EV charging. Near shopping center.',
    slotType: 'covered',
    amenities: ['covered', 'security', 'ev_charging', 'cctv', 'lighting'],
    photos: ['https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=400'],
  },
  {
    address: 'Minuyan, San Jose del Monte, Bulacan',
    lat: 14.7856,
    lon: 121.0234,
    price: 22,
    description: 'Affordable parking near residential area. Safe neighborhood.',
    slotType: 'outdoor',
    amenities: ['security', 'lighting', 'accessible'],
    photos: ['https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400'],
  },
  {
    address: 'San Rafael, San Jose del Monte, Bulacan',
    lat: 14.8412,
    lon: 121.0712,
    price: 28,
    description: 'Covered parking with wheelchair access. Well-maintained facility.',
    slotType: 'covered',
    amenities: ['covered', 'accessible', 'security', 'lighting'],
    photos: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400'],
  },
  {
    address: 'San Isidro, San Jose del Monte, Bulacan',
    lat: 14.8023,
    lon: 121.0478,
    price: 32,
    description: 'Private garage with security guard. CCTV monitored 24/7.',
    slotType: 'garage',
    amenities: ['covered', 'security', 'cctv', 'lighting'],
    photos: ['https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400'],
  },
  {
    address: 'Maharlika Highway, San Jose del Monte, Bulacan',
    lat: 14.8178,
    lon: 121.0501,
    price: 40,
    description: 'Premium parking along main highway. Perfect for travelers.',
    slotType: 'covered',
    amenities: ['covered', 'security', 'ev_charging', 'accessible', 'cctv', 'lighting'],
    photos: ['https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=400'],
  },
  {
    address: 'Ciudad Real, San Jose del Monte, Bulacan',
    lat: 14.7912,
    lon: 121.0356,
    price: 26,
    description: 'Parking in gated community. Very secure and peaceful.',
    slotType: 'outdoor',
    amenities: ['security', 'accessible', 'lighting'],
    photos: ['https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400'],
  },
  {
    address: 'Kaybanban, San Jose del Monte, Bulacan',
    lat: 14.8267,
    lon: 121.0589,
    price: 24,
    description: 'Outdoor parking near public market. Convenient location.',
    slotType: 'outdoor',
    amenities: ['lighting', 'accessible'],
    photos: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400'],
  },
  // Additional listings around the area
  {
    address: 'San Martin, San Jose del Monte, Bulacan',
    lat: 14.8456,
    lon: 121.0389,
    price: 27,
    description: 'Clean parking area near schools. Perfect for parents and students.',
    slotType: 'outdoor',
    amenities: ['security', 'lighting', 'accessible'],
    photos: ['https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400'],
  },
  {
    address: 'San Pedro, San Jose del Monte, Bulacan',
    lat: 14.8190,
    lon: 121.0678,
    price: 33,
    description: 'Covered parking near hospital. Available for long-term parking.',
    slotType: 'covered',
    amenities: ['covered', 'security', 'cctv', 'accessible', 'lighting'],
    photos: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400'],
  },
  {
    address: 'Poblacion, San Jose del Monte, Bulacan',
    lat: 14.8090,
    lon: 121.0523,
    price: 45,
    description: 'Prime downtown location. EV charging and premium amenities.',
    slotType: 'covered',
    amenities: ['covered', 'security', 'ev_charging', 'cctv', 'accessible', 'lighting', 'wifi'],
    photos: ['https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=400'],
  },
  {
    address: 'Bagong Buhay, San Jose del Monte, Bulacan',
    lat: 14.7934,
    lon: 121.0445,
    price: 18,
    description: 'Budget-friendly outdoor parking. Good for short-term parking.',
    slotType: 'outdoor',
    amenities: ['lighting'],
    photos: ['https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400'],
  },
  {
    address: 'Graceville, San Jose del Monte, Bulacan',
    lat: 14.8367,
    lon: 121.0734,
    price: 29,
    description: 'Subdivision parking with tight security. Very safe location.',
    slotType: 'outdoor',
    amenities: ['security', 'cctv', 'accessible', 'lighting'],
    photos: ['https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400'],
  },
  {
    address: 'Citrus Heights, San Jose del Monte, Bulacan',
    lat: 14.7823,
    lon: 121.0298,
    price: 31,
    description: 'Modern covered parking facility in residential complex.',
    slotType: 'covered',
    amenities: ['covered', 'security', 'cctv', 'accessible', 'lighting'],
    photos: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400'],
  },
  {
    address: 'Kaypian, San Jose del Monte, Bulacan',
    lat: 14.8289,
    lon: 121.0412,
    price: 23,
    description: 'Spacious outdoor parking. Close to public transportation.',
    slotType: 'outdoor',
    amenities: ['security', 'lighting', 'accessible'],
    photos: ['https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400'],
  },
  {
    address: 'Santa Cruz, San Jose del Monte, Bulacan',
    lat: 14.8512,
    lon: 121.0645,
    price: 38,
    description: 'Premium garage with car wash service. Well-maintained.',
    slotType: 'garage',
    amenities: ['covered', 'security', 'cctv', 'lighting'],
    photos: ['https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400'],
  },
  {
    address: 'San Roque, San Jose del Monte, Bulacan',
    lat: 14.7978,
    lon: 121.0567,
    price: 21,
    description: 'Simple parking space near church. Quiet and peaceful area.',
    slotType: 'outdoor',
    amenities: ['lighting', 'accessible'],
    photos: ['https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=400'],
  },
  {
    address: 'Paradise Heights, San Jose del Monte, Bulacan',
    lat: 14.8401,
    lon: 121.0501,
    price: 36,
    description: 'Elevated covered parking with great view. Very secure.',
    slotType: 'covered',
    amenities: ['covered', 'security', 'cctv', 'accessible', 'lighting'],
    photos: ['https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400'],
  },
];

async function seedListings() {
  console.log('Starting to seed San Jose del Monte listings...');

  try {
    // First, get or create a test user to own these listings
    let owner = await prisma.user.findFirst({
      where: { email: 'host@parkpal.com' },
    });

    if (!owner) {
      console.log('Creating test host user...');
      const hashedPassword = await bcrypt.hash('Password123', 10);
      owner = await prisma.user.create({
        data: {
          name: 'ParkPal Host',
          email: 'host@parkpal.com',
          password: hashedPassword,
          role: 'host',
          phone: '+639301234567',
        },
      });
    }

    console.log(`Using owner: ${owner.name} (ID: ${owner.id})`);

    // Create listings
    for (const listing of sampleListings) {
      const createdListing = await prisma.parkingSlot.create({
        data: {
          ...listing,
          amenities: JSON.stringify(listing.amenities), // Convert array to JSON string
          photos: listing.photos ? JSON.stringify(listing.photos) : '[]', // Convert photos array to JSON string
          ownerId: owner.id,
          status: 'available',
          isActive: true, // Auto-approve for demo purposes
          rating: Math.random() * 2 + 3, // Random rating between 3-5
        },
      });

      console.log(`✓ Created listing: ${createdListing.address} (ID: ${createdListing.id})`);
    }

    console.log(`\n✅ Successfully created ${sampleListings.length} listings in San Jose del Monte, Bulacan!`);
  } catch (error) {
    console.error('Error seeding listings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedListings();
