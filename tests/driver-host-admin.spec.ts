import { expect, futureLocalDateRange, test } from './fixtures';

const listing = { id: 'space-7', title: 'Harbor Garage', address: '12 Test Street, Manila', price: 120, status: 'available', isActive: true, slotType: 'roadside_qr', rating: 5 };
const booking = { id: 'booking-42', price: 120, platformFee: 5, address: listing.address, startTime: '2026-11-15T09:00:00.000Z', endTime: '2026-11-15T10:00:00.000Z', status: 'pending', slot: listing };
const paymentIntentId = 'pi_journey_42';

test('driver reserves a listing and can review the booking and profile', async ({ driverPage: page }) => {
  let paid = false;
  await page.route('**/api/v1/marketplace/listings/space-7', (route) => route.fulfill({ json: listing }));
  await page.route('**/api/v1/marketplace/bookings', async (route) => {
    if (route.request().method() === 'POST') await route.fulfill({ json: { booking } });
    else await route.fulfill({ json: { bookings: [booking] } });
  });
  await page.route('**/api/v1/bookings', (route) => route.fulfill({ json: [booking] }));
  await page.route('**/api/v1/users/stats', (route) => route.fulfill({ json: { totalBookings: 1, activeBookings: 0, completedBookings: 0, totalSpent: 125 } }));
  await page.route('**/api/v1/marketplace/bookings/booking-42', (route) => route.fulfill({ json: { booking: { ...booking, status: paid ? 'confirmed' : 'pending' } } }));
  await page.route('**/api/v1/payments/intent', (route) => route.fulfill({ json: { paymentIntentId, clientKey: 'client-key-test', publicKey: 'pk_test', status: 'awaiting_payment_method' } }));
  await page.route('**/api/v1/payments/confirm', (route) => { paid = true; return route.fulfill({ json: { status: 'completed' } }); });
  await page.route('https://api.paymongo.com/v1/payment_methods', (route) => route.fulfill({ json: { data: { id: 'pm_test_42', type: 'payment_method' } } }));
  await page.route('https://api.paymongo.com/v1/payment_intents/**/attach', async (route) => {
    const payload = route.request().postDataJSON();
    await route.fulfill({ json: { data: { attributes: { status: 'awaiting_next_action', next_action: { redirect: { url: payload.data.attributes.return_url } } } } } });
  });
  await page.goto('/reserve?listingId=space-7');
  const dates = await futureLocalDateRange(page);
  await page.getByLabel('Start time').fill(dates.start);
  await page.getByLabel('End time').fill(dates.end);
  await page.getByRole('button', { name: 'Reserve and continue to payment' }).click();
  await expect(page).toHaveURL('/payment?bookingId=booking-42');
  await page.getByRole('button', { name: 'Pay ₱125.00' }).click();
  await expect(page).toHaveURL(/\/bookings\/booking-42$/);
  await expect(page.getByText('Booking confirmed')).toBeVisible();
  await page.goto('/bookings');
  await expect(page.getByRole('heading', { name: 'Harbor Garage' })).toBeVisible();
  await page.getByRole('button', { name: 'View booking' }).click();
  await expect(page.getByText('Booking confirmed')).toBeVisible();
  await page.goto('/profile');
  await expect(page.getByText('Avery Driver')).toBeVisible();
});

test('profile can save an edit and shows API errors', async ({ driverPage: page }) => {
  await page.route('**/api/v1/bookings', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/v1/users/stats', (route) => route.fulfill({ json: { totalBookings: 0, activeBookings: 0, completedBookings: 0, totalSpent: 0 } }));
  await page.route('**/api/v1/users/profile', (route) => route.fulfill({ status: 400, json: { error: 'Phone number is invalid' } }));
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Edit profile' }).click();
  await page.getByLabel('Phone').fill('invalid');
  await page.getByRole('button', { name: 'Save Changes' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Phone number is invalid' })).toBeVisible();
});

test('host creates a listing and manages existing listing availability', async ({ hostPage: page }) => {
  let created: any;
  let active = true;
  await page.route('**/api/v1/marketplace/host/listings', (route) => route.fulfill({ json: [{ ...listing, isActive: active }] }));
  await page.route('**/api/v1/marketplace/host/earnings', (route) => route.fulfill({ json: { summary: { totalEarnings: 0, pendingPayout: 0, totalBookings: 0 } } }));
  await page.route('**/api/v1/marketplace/listings', async (route) => {
    if (route.request().method() === 'POST') { created = route.request().postDataJSON(); await route.fulfill({ status: 201, json: { listing } }); }
    else await route.continue();
  });
  await page.route('**/api/v1/marketplace/listings/space-7/toggle', async (route) => { active = !active; await route.fulfill({ json: { listing: { ...listing, isActive: active } } }); });
  await page.goto('/list-slot');
  await page.getByLabel('Listing title').fill('Harbor Garage');
  await page.getByLabel('Latitude').fill('14.5995');
  await page.getByLabel('Longitude').fill('120.9842');
  await page.getByLabel('Full Address').fill(listing.address);
  await page.getByLabel('Price per Hour (₱)').fill('120');
  await page.getByRole('button', { name: /create listing/i }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Listing created successfully' })).toBeVisible();
  expect(created).toMatchObject({ title: 'Harbor Garage', price: 120 });
  await page.goto('/host-dashboard');
  await expect(page.getByRole('heading', { name: 'Host Dashboard' })).toBeVisible();
  await expect(page.getByText('12 Test Street, Manila')).toBeVisible();
  const toggleRequest = page.waitForRequest((request) => request.method() === 'PATCH' && request.url().includes('/marketplace/listings/space-7/toggle'));
  await page.getByRole('button', { name: 'Pause' }).click();
  await toggleRequest;
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
});

test('admin reviews a candidate and reads metrics', async ({ adminPage: page }) => {
  const candidate = { id: 'candidate-1', scanArea: 'Manila', googlePlaceId: 'place-test', scanTimestamp: '2026-11-13T00:00:00.000Z', candidateStatus: 'candidate_preview' };
  await page.route('**/api/v1/admin/parking-candidates**', (route) => route.fulfill({ json: { candidates: [candidate] } }));
  await page.route('**/api/v1/admin/parking-candidates/candidate-1/live-details', (route) => route.fulfill({ json: { details: { name: 'Test Garage', address: listing.address, location: { lat: 14.5995, lng: 120.9842 } } } }));
  await page.route('**/api/v1/admin/parking-candidates/candidate-1/approve-preview', (route) => route.fulfill({ json: { message: 'Candidate approved', candidate } }));
  const zeroPair = { current: 0, previous: 0 };
  await page.route('**/api/v1/admin/dashboard/metrics**', (route) => route.fulfill({ json: {
    period: '24h', range: { currentFrom: '2026-11-12T00:00:00Z', currentTo: '2026-11-13T00:00:00Z', previousFrom: '2026-11-11T00:00:00Z', previousTo: '2026-11-12T00:00:00Z' },
    product: { users: zeroPair, bookings: { current: {}, previous: {} }, completedPaymentsPhp: { ...zeroPair, currentCount: 0, previousCount: 0 }, supply: { activeOwnerListedSpaces: 0, newActiveOwnerListedSpaces: zeroPair, activeCommercialZones: 0 }, zoneAnalytics: { averageReportedOccupancyPercent: null, samples: 0, note: '' }, webVitals: [] },
    engineering: { status: 'operational', checkedAt: '2026-11-13T00:00:00Z', dependencies: {}, runtime: { scope: 'process', uptimeSeconds: 0, memory: { rssBytes: 0, heapUsedBytes: 0, heapTotalBytes: 0 }, http: { requests: 0, clientErrors: 0, serverErrors: 0, serverErrorRatePercent: 0, averageLatencyMs: null, latencyObservations: 0 } } }, generatedAt: '2026-11-13T00:00:00Z',
  } }));
  await page.goto('/admin-dashboard');
  await expect(page.getByText('Manila', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Details' }).click();
  await page.getByRole('button', { name: 'Approve for preview' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Candidate approved' })).toBeVisible();
  await page.goto('/admin-dashboard/metrics');
  await expect(page.getByText('ParkPal operating pulse')).toBeVisible();
});

test('host cannot open admin pages', async ({ hostPage: page }) => {
  await page.goto('/admin-dashboard/metrics');
  await expect(page).toHaveURL('/');
});
