// Seed database via API endpoints (doesn't require direct DB access)
const API_BASE_URL = 'https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app/api/v1';

async function createUser(userData) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  if (!response.ok) {
    const error = await response.text();
    console.log(`⚠️  User ${userData.email} might already exist: ${error}`);
    return null;
  }
  const data = await response.json();
  return data;
}

async function createListing(listingData, token) {
  const response = await fetch(`${API_BASE_URL}/slots`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(listingData),
  });
  if (!response.ok) {
    const error = await response.text();
    console.log(`❌ Failed to create listing: ${error}`);
    return null;
  }
  return await response.json();
}

async function main() {
  console.log('🌱 Seeding database via API...\n');

  // Create host users
  const hosts = [
    {
      name: 'Pedro Reyes',
      email: 'pedro@example.com',
      password: 'TestDev2024!SecurePass',
      role: 'host',
      phone: '+639191234567',
    },
    {
      name: 'Ana Garcia',
      email: 'ana@example.com',
      password: 'TestDev2024!SecurePass',
      role: 'host',
      phone: '+639201234567',
    },
  ];

  console.log('Creating host users...');
  const createdHosts = [];
  for (const host of hosts) {
    const result = await createUser(host);
    if (result) {
      console.log(`✅ Created host: ${host.email}`);
      createdHosts.push({ ...host, token: result.token });
    }
  }

  if (createdHosts.length === 0) {
    console.log('\n⚠️  No new hosts created. Trying to login with existing credentials...');
    // Try to login
    for (const host of hosts) {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: host.email, password: host.password }),
      });
      if (response.ok) {
        const data = await response.json();
        createdHosts.push({ ...host, token: data.token });
        console.log(`✅ Logged in as: ${host.email}`);
      }
    }
  }

  // Create parking listings
  const listings = [
    {
      address: 'SM Mall of Asia, Seaside Blvd, Pasay',
      lat: 14.5315,
      lon: 120.9845,
      price: 40,
      description: 'Covered parking near main entrance. Safe and secure 24/7.',
      amenities: ['covered', 'security', 'cctv', 'restroom'],
      slotType: 'commercial_manual',
    },
    {
      address: 'Ayala Center, Ayala Avenue, Makati',
      lat: 14.551,
      lon: 121.029,
      price: 50,
      description: 'Convenient spot near Glorietta entrance. Premium location.',
      amenities: ['covered', 'security', 'cctv', 'restroom', 'elevator'],
      slotType: 'commercial_manual',
    },
    {
      address: 'BGC High Street, 9th Avenue, Taguig',
      lat: 14.551,
      lon: 121.046,
      price: 60,
      description: 'Premium parking in BGC, near restaurants and shops.',
      amenities: ['covered', 'security', 'cctv', 'valet', 'restroom'],
      slotType: 'commercial_manual',
    },
    {
      address: 'UP Diliman, University Avenue, Quezon City',
      lat: 14.655,
      lon: 121.065,
      price: 20,
      description: 'Street parking near Academic Oval. Affordable and accessible.',
      amenities: ['outdoor', 'lighting'],
      slotType: 'roadside_qr',
    },
    {
      address: 'Roxas Boulevard, Manila Ocean Park, Manila',
      lat: 14.5732,
      lon: 120.9742,
      price: 30,
      description: 'Street parking with bay view. Great for weekend trips.',
      amenities: ['outdoor', 'lighting', 'bay_view'],
      slotType: 'roadside_qr',
    },
  ];

  console.log(`\nCreating ${listings.length} parking listings...\n`);
  let successCount = 0;
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const host = createdHosts[i % createdHosts.length];

    if (!host || !host.token) {
      console.log(`⚠️  No token for listing ${i + 1}, skipping...`);
      continue;
    }

    const result = await createListing(listing, host.token);
    if (result) {
      console.log(`✅ Created listing ${i + 1}/${listings.length}: ${listing.address}`);
      successCount++;
    }
  }

  console.log(`\n🎉 Seeding completed!`);
  console.log(`📊 Summary:`);
  console.log(`- Hosts created/logged in: ${createdHosts.length}`);
  console.log(`- Listings created: ${successCount}/${listings.length}`);
  console.log(`\n🔑 Test Credentials:`);
  console.log(`Host 1: pedro@example.com / TestDev2024!SecurePass`);
  console.log(`Host 2: ana@example.com / TestDev2024!SecurePass`);
}

main().catch(console.error);
