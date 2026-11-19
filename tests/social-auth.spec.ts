import { expect, test, users } from './fixtures';

test.skip(process.env.SOCIAL_AUTH_E2E !== '1', 'Run with SOCIAL_AUTH_E2E=1 to use stub provider credentials.');

async function stubProviders(page: import('@playwright/test').Page) {
  await page.route('https://accounts.google.com/gsi/client', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.google={accounts:{id:{initialize(options){window.googleCallback=options.callback},renderButton(element){const button=document.createElement('button');button.textContent='Continue with Google';button.onclick=()=>window.googleCallback({credential:'google-browser-token'});element.appendChild(button)}}}};`,
  }));
  await page.route('https://appleid.cdn-apple.com/**', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.AppleID={auth:{init(){},signIn(){return Promise.resolve({authorization:{id_token:'apple-browser-token'},user:{email:'driver@example.test',name:{firstName:'Avery',lastName:'Driver'}}})}}};`,
  }));
  await page.route('https://connect.facebook.net/en_US/sdk.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.FB={init(){},login(callback){callback({authResponse:{accessToken:'facebook-browser-token'}})}};`,
  }));
}

for (const tab of ['Login', 'Register'] as const) {
  for (const provider of ['google', 'apple', 'facebook'] as const) {
    test(`${provider} signs in from ${tab} and returns to the requested page`, async ({ unauthenticatedPage: page }) => {
      await stubProviders(page);
      let requestBody: unknown;
      await page.route(`**/api/v1/auth/${provider}`, (route) => {
        requestBody = route.request().postDataJSON();
        return route.fulfill({ json: { token: 'social-session-token', user: users.driver } });
      });
      await page.goto('/login?returnTo=%2Fbookings');
      if (tab === 'Register') await page.getByRole('tab', { name: 'Register' }).click();
      await page.getByRole('button', { name: `Continue with ${provider[0].toUpperCase()}${provider.slice(1)}` }).click();
      await expect(page).toHaveURL(/\/bookings$/);
      expect(requestBody).toMatchObject({ [`${provider}Token`]: `${provider}-browser-token` });
      expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('social-session-token');
    });
  }

  test(`provider SDK failures stay visible and disabled on ${tab}`, async ({ unauthenticatedPage: page }) => {
    await page.route('https://accounts.google.com/gsi/client', (route) => route.abort());
    await page.route('https://appleid.cdn-apple.com/**', (route) => route.abort());
    await page.route('https://connect.facebook.net/en_US/sdk.js', (route) => route.abort());
    await page.goto('/login');
    if (tab === 'Register') await page.getByRole('tab', { name: 'Register' }).click();
    for (const provider of ['Google', 'Apple', 'Facebook']) {
      await expect(page.getByRole('button', { name: `Continue with ${provider}` })).toBeDisabled();
      await expect(page.getByText(`${provider} sign-in is unavailable right now.`)).toBeVisible();
    }
  });
}

test('a provider account conflict stays visible on the login page', async ({ unauthenticatedPage: page }) => {
  await stubProviders(page);
  await page.route('**/api/v1/auth/facebook', (route) => route.fulfill({
    status: 409,
    json: { error: 'An account with this email already exists. Please sign in with your original method.' },
  }));
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue with Facebook' }).click();
  await expect(page.getByRole('alert')).toContainText('already exists');
  await expect(page).toHaveURL(/\/login$/);
});
