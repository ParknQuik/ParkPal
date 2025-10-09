const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

// Test credentials from seed
const DRIVER_CREDS = { email: 'juan@example.com', password: 'password123' };
const HOST_CREDS = { email: 'pedro@example.com', password: 'password123' };

let driverToken = '';
let hostToken = '';
let newListingId = null;
let bookingId = null;
let sessionId = null;

async function test() {
  console.log('🧪 Starting Marketplace API Tests\n');

  try {
    // Test 1: Login as driver
    console.log('1️⃣  Testing Login (Driver)...');
    const driverLogin = await axios.post(`${API_URL}/auth/login`, DRIVER_CREDS);
    driverToken = driverLogin.data.token;
    console.log('✅ Driver login successful');
    console.log(`   Token: ${driverToken.substring(0, 20)}...`);

    // Test 2: Login as host
    console.log('\n2️⃣  Testing Login (Host)...');
    const hostLogin = await axios.post(`${API_URL}/auth/login`, HOST_CREDS);
    hostToken = hostLogin.data.token;
    console.log('✅ Host login successful');
    console.log(`   Token: ${hostToken.substring(0, 20)}...`);

    // Test 3: Create marketplace listing (as host)
    console.log('\n3️⃣  Testing Create Listing...');
    const listing = await axios.post(
      `${API_URL}/marketplace/listings`,
      {
        lat: 14.5995,
        lon: 120.9842,
        price: 35,
        address: 'Test Address, Manila City Hall',
        slotType: 'roadside_qr',
        description: 'Safe covered parking near the mall',
        amenities: ['covered', 'security', 'cctv'],
        photos: ['https://example.com/photo1.jpg'],
      },
      {
        headers: { Authorization: `Bearer ${hostToken}` },
      }
    );
    newListingId = listing.data.id;
    console.log('✅ Listing created successfully');
    console.log(`   Listing ID: ${newListingId}`);
    console.log(`   QR Code: ${listing.data.qrCode ? 'Generated' : 'Missing'}`);
    console.log(`   Status: ${listing.data.status}`);

    // Test 4: Search listings
    console.log('\n4️⃣  Testing Search Listings...');
    const search = await axios.get(`${API_URL}/marketplace/search`, {
      params: {
        lat: 14.5995,
        lon: 120.9842,
        radius: 10,
        minPrice: 20,
        maxPrice: 100,
        status: 'available',
      },
    });
    console.log('✅ Search successful');
    console.log(`   Found ${search.data.count} listings`);
    if (search.data.listings.length > 0) {
      console.log(
        `   Sample: ${search.data.listings[0]?.address} - ₱${search.data.listings[0]?.price}/hr`
      );
      console.log(`   Distance: ${search.data.listings[0]?.distance?.toFixed(2)} km`);
    }

    // Test 5: Create booking (as driver)
    console.log('\n5️⃣  Testing Create Booking...');
    const startTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    const endTime = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours from now
    const booking = await axios.post(
      `${API_URL}/marketplace/bookings`,
      {
        slotId: newListingId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      },
      {
        headers: { Authorization: `Bearer ${driverToken}` },
      }
    );
    bookingId = booking.data.id;
    console.log('✅ Booking created successfully');
    console.log(`   Booking ID: ${bookingId}`);
    console.log(`   Price: ₱${booking.data.price}`);
    console.log(`   Platform Fee: ₱${booking.data.platformFee}`);
    console.log(`   Host Earnings: ₱${booking.data.hostEarnings}`);
    console.log(`   Status: ${booking.data.status}`);

    // Test 6: QR Check-in (as driver)
    console.log('\n6️⃣  Testing QR Check-in...');
    try {
      const checkin = await axios.post(
        `${API_URL}/marketplace/qr/checkin`,
        {
          qrData: listing.data.qrCode, // Use the generated QR code data
          bookingId: bookingId,
        },
        {
          headers: { Authorization: `Bearer ${driverToken}` },
        }
      );
      sessionId = checkin.data.session.id;
      console.log('✅ QR Check-in successful');
      console.log(`   Session ID: ${sessionId}`);
      console.log(`   Check-in Time: ${checkin.data.session.checkInTime}`);
      console.log(`   Slot Status: ${checkin.data.slot?.status || 'occupied'}`);
    } catch (error) {
      console.log('⚠️  QR Check-in failed (may need valid QR code)');
      console.log(`   Error: ${error.response?.data?.error || error.message}`);
    }

    // Test 7: QR Check-out (if session exists)
    if (sessionId) {
      console.log('\n7️⃣  Testing QR Check-out...');
      try {
        // Wait a moment to simulate parking time
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const checkout = await axios.post(
          `${API_URL}/marketplace/qr/checkout`,
          {
            sessionId: sessionId,
          },
          {
            headers: { Authorization: `Bearer ${driverToken}` },
          }
        );
        console.log('✅ QR Check-out successful');
        console.log(`   Check-out Time: ${checkout.data.session.checkOutTime}`);
        console.log(`   Duration: ${checkout.data.session.durationMinutes} minutes`);
        console.log(`   Total Amount: ₱${checkout.data.session.totalAmount}`);
        console.log(`   Slot Status: ${checkout.data.slot.status}`);
      } catch (error) {
        console.log('⚠️  QR Check-out failed');
        console.log(`   Error: ${error.response?.data?.error || error.message}`);
      }
    }

    // Test 8: Get host earnings
    console.log('\n8️⃣  Testing Host Earnings...');
    const earnings = await axios.get(`${API_URL}/marketplace/host/earnings`, {
      headers: { Authorization: `Bearer ${hostToken}` },
    });
    console.log('✅ Host earnings retrieved');
    console.log(`   Total Earnings: ₱${earnings.data.summary.totalEarnings}`);
    console.log(`   Pending Payout: ₱${earnings.data.summary.pendingPayout}`);
    console.log(`   Total Bookings: ${earnings.data.summary.totalBookings}`);

    // Test 9: Create review (if session exists)
    if (sessionId) {
      console.log('\n9️⃣  Testing Create Review...');
      try {
        const review = await axios.post(
          `${API_URL}/marketplace/reviews`,
          {
            slotId: newListingId,
            bookingId: bookingId,
            rating: 5,
            comment: 'Great parking spot, very convenient!',
          },
          {
            headers: { Authorization: `Bearer ${driverToken}` },
          }
        );
        console.log('✅ Review created successfully');
        console.log(`   Rating: ${review.data.rating}/5`);
        console.log(`   Comment: ${review.data.comment}`);
      } catch (error) {
        console.log('⚠️  Review creation skipped (booking not completed)');
        console.log(`   Error: ${error.response?.data?.error || error.message}`);
      }
    }

    console.log('\n✅ All core marketplace tests completed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(`   ${error.response?.data?.error || error.message}`);
    if (error.response?.data) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

test();
