import { expect, test } from '@playwright/test';

test('development confirmation opens the confirmed booking without payment-provider calls', async ({ page }) => {
  const booking = {
    id: 123,
    userId: 7,
    status: 'pending',
    price: 50,
    platformFee: 2.5,
    startTime: '2030-01-01T10:00:00.000Z',
    endTime: '2030-01-01T11:00:00.000Z',
    slot: { id: 9, address: 'Test parking space', status: 'reserved' },
  };
  const paymentProviderRequests: string[] = [];
  let confirmedBooking = booking;
  page.on('request', (request) => {
    if (request.url().includes('paymongo.com') || request.url().includes('/payments/')) {
      paymentProviderRequests.push(request.url());
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem('token', 'mock-auth-token');
    localStorage.setItem('user', JSON.stringify({ id: 7, role: 'driver', name: 'Test Driver' }));
  });
  await page.route('**/marketplace/bookings/123', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ booking: confirmedBooking }) });
  });
  await page.route('**/marketplace/bookings/123/dev-confirm', async (route) => {
    expect(route.request().method()).toBe('POST');
    confirmedBooking = { ...booking, status: 'confirmed' };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Development booking confirmed', booking: confirmedBooking }),
    });
  });

  await page.goto('/payment?bookingId=123');
  await page.getByRole('button', { name: 'Simulate booking confirmation (dev)' }).click();
  await expect(page).toHaveURL(/\/bookings\/123$/);
  await expect(page.getByText('Booking confirmed')).toBeVisible();
  expect(paymentProviderRequests).toEqual([]);
});
