import { expect, test, users } from './fixtures';

const listing = { id: 'space-7', title: 'Harbor Garage', address: '12 Test Street, Manila', price: 120, status: 'available', isActive: true, ownerId: 'host-01', slotType: 'roadside_qr', description: 'Covered, secure parking', amenities: ['covered'] };

test('public search opens the map and listing details without a Google Maps dependency', async ({ unauthenticatedPage: page }) => {
  await page.route('**/api/v1/marketplace/search**', (route) => route.fulfill({ json: { data: [listing] } }));
  await page.route('**/api/v1/marketplace/listings/space-7', (route) => route.fulfill({ json: listing }));
  await page.goto('/search');
  await expect(page.getByRole('heading', { name: 'Your next stop, minus the parking hunt.' })).toBeVisible();
  await page.getByRole('button', { name: 'Browse Map' }).click();
  await expect(page).toHaveURL(/\/map\?/);
  await expect(page.getByText('12 Test Street, Manila')).toBeVisible();
  await page.getByRole('button', { name: /12 Test Street, Manila/ }).click();
  await page.getByRole('button', { name: 'View listing details' }).click();
  await expect(page).toHaveURL('/listing/space-7');
  await expect(page.getByRole('heading', { name: 'Listing Details' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reserve this space' })).toBeVisible();
  await page.getByRole('button', { name: 'Reserve this space' }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  expect(new URL(page.url()).searchParams.get('returnTo')).toBe('/reserve?listingId=space-7');
});

test('search shows an empty map result and privacy and terms are public', async ({ unauthenticatedPage: page }) => {
  await page.route('**/api/v1/marketplace/search**', (route) => route.fulfill({ json: { data: [] } }));
  await page.goto('/map');
  await expect(page.getByText('No parking slots found')).toBeVisible();
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible();
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: /terms of service/i })).toBeVisible();
  await page.goto('/a-route-that-does-not-exist');
  await expect(page.getByRole('heading', { name: /page not found/i })).toBeVisible();
  await page.getByRole('button', { name: 'Privacy choices' }).click();
  await expect(page.getByRole('region', { name: 'Privacy choices' })).toBeVisible();
  await page.getByRole('button', { name: 'Allow optional analytics' }).click();
  await expect(page.getByRole('region', { name: 'Privacy choices' })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('parkpal-analytics-consent'))).toBe('accepted');
});

test('login uses the intercepted auth endpoint and returns to the requested page', async ({ unauthenticatedPage: page }) => {
  let loginBody: any;
  await page.route('**/api/v1/auth/login', async (route) => {
    loginBody = route.request().postDataJSON();
    await route.fulfill({ json: { token: 'signed-in-token', user: users.driver } });
  });
  await page.goto('/login?returnTo=%2Fbookings');
  await page.getByLabel('Email').fill(users.driver.email);
  await page.getByLabel('Password').fill('CorrectHorse9!');
  await page.locator('form').getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/bookings$/);
  expect(loginBody).toEqual({ email: users.driver.email, password: 'CorrectHorse9!' });

});

test('registration uses the intercepted auth endpoint', async ({ unauthenticatedPage: page }) => {
  await page.route('**/api/v1/auth/register', (route) => route.fulfill({ json: { token: 'registered-token', user: users.driver } }));
  await page.goto('/login');
  await page.getByRole('tab', { name: 'Register' }).click();
  await page.getByLabel('Name').fill('Avery Driver');
  await page.getByLabel('Email').fill('new-driver@example.test');
  await page.getByLabel('Password').fill('StrongPass9!');
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page).toHaveURL('/');
});

test('protected routes return to the requested URL after login', async ({ unauthenticatedPage: page }) => {
  await page.goto('/bookings/booking-42?from=profile');
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  await expect(page).toHaveURL(/returnTo=%2Fbookings%2Fbooking-42%3Ffrom%3Dprofile/);
});

test('driver role is denied host and admin routes', async ({ driverPage }) => {
  await driverPage.goto('/admin-dashboard');
  await expect(driverPage).toHaveURL('/');
  await driverPage.goto('/host-dashboard');
  await expect(driverPage).toHaveURL('/');
});
