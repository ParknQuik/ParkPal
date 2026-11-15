import { expect, test } from './fixtures';

const bookingId = 'booking-42';
const intentId = 'pi_test_42';
const booking = {
  id: bookingId,
  price: 120,
  platformFee: 5,
  address: '12 Test Street, Manila',
  startTime: '2026-11-15T09:00:00.000Z',
  endTime: '2026-11-15T10:00:00.000Z',
  status: 'pending',
};

async function prepareCheckout(page: import('@playwright/test').Page, confirmationStatus: string, intentFailure?: { status: number; body: unknown }) {
  const confirmations: unknown[] = [];
  let attachedPayload: any;

  await page.addInitScript(() => {
    localStorage.setItem('token', 'e2e-token');
    localStorage.setItem('user', JSON.stringify({ id: 'driver-1', name: 'Test Driver', email: 'driver@example.test', role: 'driver' }));
    localStorage.setItem('parkpal-analytics-consent', 'rejected');
  });
  await page.route('**/api/v1/marketplace/bookings/' + bookingId, (route) => route.fulfill({
    json: { booking },
  }));
  await page.route('**/api/v1/payments/intent', (route) => route.fulfill(intentFailure ? {
    status: intentFailure.status,
    json: intentFailure.body,
  } : {
    json: { paymentIntentId: intentId, clientKey: 'client-key-test', publicKey: 'pk_test', status: 'awaiting_payment_method' },
  }));
  await page.route('**/api/v1/payments/confirm', async (route) => {
    confirmations.push(route.request().postDataJSON());
    await route.fulfill({ json: { status: confirmationStatus } });
  });
  await page.route('https://api.paymongo.com/v1/payment_methods', (route) => route.fulfill({
    json: { data: { id: 'pm_test_42', type: 'payment_method' } },
  }));
  await page.route('https://api.paymongo.com/v1/payment_intents/**/attach', async (route) => {
    attachedPayload = route.request().postDataJSON();
    const returnUrl = attachedPayload.data.attributes.return_url;
    await route.fulfill({ json: { data: { attributes: {
      status: 'awaiting_next_action',
      next_action: { redirect: { url: returnUrl } },
    } } } });
  });

  await page.goto(`/payment?bookingId=${bookingId}`);
  await expect(page.getByRole('heading', { name: 'Complete payment' })).toBeVisible();
  await expect(page.getByText('12 Test Street, Manila')).toBeVisible();
  return { confirmations, getAttachedPayload: () => attachedPayload };
}

test('shows a readable backend 400 on checkout without navigating', async ({ driverPage: page }) => {
  await prepareCheckout(page, 'completed', { status: 400, body: { error: { message: 'Booking already paid' } } });

  await page.getByRole('button', { name: 'Pay ₱125.00' }).click();

  await expect(page.getByRole('alert').filter({ hasText: 'Booking already paid' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Complete payment' })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/payment\\?bookingId=${bookingId}$`));
});

test('reloads a pending booking and confirms success only after the provider return', async ({ driverPage: page }) => {
  const { confirmations, getAttachedPayload } = await prepareCheckout(page, 'completed');

  await page.getByRole('button', { name: 'Pay ₱125.00' }).click();
  await expect(page).toHaveURL(new RegExp(`/payment\\?bookingId=${bookingId}&payment_intent_id=${intentId}`));
  await expect(page).toHaveURL(new RegExp(`/bookings/${bookingId}$`));

  expect(getAttachedPayload().data.attributes).toMatchObject({
    payment_method: 'pm_test_42',
    client_key: 'client-key-test',
    return_url: `${new URL(page.url()).origin}/payment?bookingId=${bookingId}&payment_intent_id=${intentId}`,
  });
  // The initial return from the provider is confirmed once in the submit path,
  // then again after the browser loads the provider return URL.
  expect(confirmations).toEqual([
    { paymentIntentId: intentId },
    { paymentIntentId: intentId },
  ]);
});

for (const status of ['pending', 'failed', 'cancelled']) {
  test(`keeps a ${status} payment on checkout`, async ({ driverPage: page }) => {
    const { confirmations } = await prepareCheckout(page, status);

    await page.getByRole('button', { name: 'Pay ₱125.00' }).click();

    await expect(page).toHaveURL(new RegExp(`/payment\\?bookingId=${bookingId}&payment_intent_id=${intentId}`));
    await expect(page.getByRole('heading', { name: 'Complete payment' })).toBeVisible();
    if (status === 'pending') {
      await expect(page.getByRole('alert').filter({ hasText: /^pending$/ })).toBeVisible();
    } else {
      await expect(page.getByRole('alert').filter({ hasText: status === 'failed' ? 'Payment failed' : 'Payment was cancelled' })).toBeVisible();
    }
    expect(confirmations).toEqual([
      { paymentIntentId: intentId },
      { paymentIntentId: intentId },
    ]);
  });
}
