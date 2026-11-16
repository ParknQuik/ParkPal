import { test as base, expect, type Page } from '@playwright/test';

export type Role = 'driver' | 'host' | 'admin';
export const users = {
  driver: { id: 'driver-e2e', name: 'Avery Driver', email: 'driver@example.test', role: 'driver' as const },
  host: { id: 'host-e2e', name: 'Harper Host', email: 'host@example.test', role: 'host' as const },
  admin: { id: 'admin-e2e', name: 'Alex Admin', email: 'admin@example.test', role: 'admin' as const },
};

async function isolateNetwork(page: Page) {
  await page.route('**/api/v1/**', (route) => route.abort('blockedbyclient'));
  await page.route('https://maps.googleapis.com/**', (route) => route.abort('blockedbyclient'));
  await page.route('https://maps.gstatic.com/**', (route) => route.abort('blockedbyclient'));
  await page.route('https://api.paymongo.com/**', (route) => route.abort('blockedbyclient'));
}

async function seed(page: Page, role?: Role) {
  await isolateNetwork(page);
  if (role === 'driver') {
    // Drivers need a saved vehicle before the reservation action is enabled.
    await page.route('**/api/v1/vehicles', (route) => route.fulfill({ json: [
      { id: 7, make: 'Toyota', model: 'Vios', year: 2023, color: 'Silver', licensePlate: 'ABC-1234', isDefault: true },
    ] }));
  }
  await page.addInitScript(({ user }) => {
    localStorage.setItem('parkpal-analytics-consent', 'rejected');
    if (user) {
      localStorage.setItem('token', 'e2e-token');
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, { user: role ? users[role] : null });
}

export const test = base.extend<{
  unauthenticatedPage: Page;
  driverPage: Page;
  hostPage: Page;
  adminPage: Page;
}>({
  unauthenticatedPage: async ({ page }, use) => { await seed(page); await use(page); },
  driverPage: async ({ page }, use) => { await seed(page, 'driver'); await use(page); },
  hostPage: async ({ page }, use) => { await seed(page, 'host'); await use(page); },
  adminPage: async ({ page }, use) => { await seed(page, 'admin'); await use(page); },
});

export async function futureLocalDateRange(page: Page) {
  return page.evaluate(() => {
    const toInputValue = (date: Date) => {
      const pad = (value: number) => String(value).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };
    const start = new Date(Date.now() + 48 * 60 * 60 * 1000);
    start.setSeconds(0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return { start: toInputValue(start), end: toInputValue(end) };
  });
}

export { expect };
