import { expect, futureLocalDateRange, test } from './fixtures';

test('mobile browser completes a driver reservation through confirmed booking', async ({ driverPage: page }) => {
  const listing = { id: 'mobile-space', title: 'Central Garage', address: 'Makati, Manila', price: 95, status: 'available', isActive: true, ownerId: 'host-01', slotType: 'roadside_qr', rating: 5 };
  const booking = { id: 'mobile-booking', price: 95, platformFee: 5, startTime: '2026-11-15T09:00:00.000Z', endTime: '2026-11-15T10:00:00.000Z', status: 'pending', slot: listing };
  const paymentIntentId = 'pi_mobile_test';
  let paid = false;
  await page.route('**/api/v1/marketplace/search**', (route) => route.fulfill({ json: { data: [listing] } }));
  await page.route('**/api/v1/marketplace/listings/mobile-space', (route) => route.fulfill({ json: listing }));
  await page.route('**/api/v1/marketplace/bookings', (route) => route.fulfill({ json: { booking } }));
  await page.route('**/api/v1/marketplace/bookings/mobile-booking', (route) => route.fulfill({ json: { booking: { ...booking, status: paid ? 'confirmed' : 'pending' } } }));
  await page.route('**/api/v1/payments/intent', (route) => route.fulfill({ json: { paymentIntentId, clientKey: 'mobile-client-key', publicKey: 'pk_test', status: 'awaiting_payment_method' } }));
  await page.route('**/api/v1/payments/confirm', (route) => { paid = true; return route.fulfill({ json: { status: 'completed' } }); });
  await page.route('https://api.paymongo.com/v1/payment_methods', (route) => route.fulfill({ json: { data: { id: 'pm_mobile_test', type: 'payment_method' } } }));
  await page.route('https://api.paymongo.com/v1/payment_intents/**/attach', async (route) => {
    const payload = route.request().postDataJSON();
    await route.fulfill({ json: { data: { attributes: { status: 'awaiting_next_action', next_action: { redirect: { url: payload.data.attributes.return_url } } } } } });
  });
  await page.goto('/search');
  await expect(page.getByRole('heading', { name: 'Your next stop, minus the parking hunt.' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Browse Map' }).click();
  await expect(page).toHaveURL(/\/map\?/);
  await page.goto('/listing/mobile-space');
  await expect(page.getByText('Makati, Manila')).toBeVisible();
  await page.getByRole('button', { name: 'Reserve this space' }).click();
  const dates = await futureLocalDateRange(page);
  await page.getByLabel('Start time').fill(dates.start);
  await page.getByLabel('End time').fill(dates.end);
  await page.getByRole('button', { name: 'Reserve and continue to payment' }).click();
  await expect(page).toHaveURL('/payment?bookingId=mobile-booking');
  await page.getByRole('button', { name: 'Pay ₱100.00' }).click();
  await expect(page).toHaveURL(/\/bookings\/mobile-booking$/);
  await expect(page.getByText('Booking confirmed')).toBeVisible();
});
