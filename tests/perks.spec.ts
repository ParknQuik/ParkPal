import { expect, test } from './fixtures';

for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`Perks fits a ${viewport.width}px viewport`, async ({ driverPage: page }) => {
    await page.setViewportSize(viewport);
    await page.route('**/api/v1/points/balance', (route) => route.fulfill({ json: { balance: 125 } }));
    await page.route('**/api/v1/points/history**', (route) => route.fulfill({ json: {
      transactions: [{ id: 1, amount: 125, type: 'EARNED', description: 'Welcome bonus', createdAt: '2026-11-18T00:00:00.000Z' }],
      pagination: { page: 1, limit: 10, total: 1, pages: 1 },
    } }));
    await page.route('**/api/v1/referrals/stats', (route) => route.fulfill({ json: {
      totalReferrals: 0, pendingReferrals: 0, activeReferrals: 0, completedReferrals: 0, totalPointsEarned: 0,
    } }));

    await page.goto(`${process.env.PERKS_TEST_BASE_URL ?? ''}/perks`);

    await expect(page.getByRole('heading', { name: 'Perks' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '125 points' })).toBeVisible();
    await expect(page.getByText('Welcome bonus')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Referrals' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('Perks requires sign in', async ({ unauthenticatedPage: page }) => {
  await page.goto('/perks');
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
});

test('Perks history pages show the requested transactions', async ({ driverPage: page }) => {
  await page.route('**/api/v1/points/balance', (route) => route.fulfill({ json: { balance: 70 } }));
  await page.route('**/api/v1/referrals/stats', (route) => route.fulfill({ json: {
    totalReferrals: 1, pendingReferrals: 1, activeReferrals: 0, completedReferrals: 0, totalPointsEarned: 0,
  } }));
  await page.route('**/api/v1/points/history**', (route) => {
    const requestedPage = Number(new URL(route.request().url()).searchParams.get('page'));
    return route.fulfill({ json: {
      transactions: requestedPage === 1
        ? [{ id: 1, amount: 100, type: 'EARNED', description: 'Booking points', createdAt: '2026-11-17T08:00:00.000Z' }]
        : [{ id: 2, amount: -30, type: 'SPENT', description: 'Used points', createdAt: '2026-11-18T09:30:00.000Z', referenceId: 42, referenceType: 'BOOKING' }],
      pagination: { page: requestedPage, limit: 10, total: 2, pages: 2 },
    } });
  });

  await page.goto('/perks');
  await expect(page.getByText('Booking points')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Used points')).toBeVisible();
  await expect(page.getByText('Booking points')).toHaveCount(0);
  await expect(page.getByText('Page 2 of 2')).toBeVisible();
});
