const crypto = require('crypto');
const jwt = require('jsonwebtoken');

jest.mock('axios');
jest.mock('../services/socialAuthService', () => ({ signInWithSocialProfile: jest.fn() }));

const axios = require('axios');
const { signInWithSocialProfile } = require('../services/socialAuthService');
const { appleAuth } = require('../controllers/appleAuthController');
const { facebookAuth } = require('../controllers/facebookAuthController');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const appleKey = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key' };
const originalEnv = {
  APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID,
  APPLE_WEB_CLIENT_ID: process.env.APPLE_WEB_CLIENT_ID,
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
};

const response = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};

const appleToken = (audience, email = 'new-user@example.com') => jwt.sign(
  { sub: 'apple-user', email },
  privateKey,
  {
    algorithm: 'RS256',
    keyid: 'test-key',
    issuer: 'https://appleid.apple.com',
    audience,
    expiresIn: '5m',
  }
);

beforeEach(() => {
  axios.get.mockReset();
  signInWithSocialProfile.mockReset();
  process.env.APPLE_CLIENT_ID = 'com.parknquik.mobile';
  process.env.APPLE_WEB_CLIENT_ID = 'com.parknquik.web';
  process.env.FACEBOOK_APP_ID = 'parkpal-meta-app';
  process.env.FACEBOOK_APP_SECRET = 'test-secret';
  axios.get.mockResolvedValue({ data: { keys: [appleKey] } });
  signInWithSocialProfile.mockResolvedValue({ token: 'parkpal-session', user: { id: 'user-1' } });
});

afterAll(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('Apple token audiences', () => {
  test.each(['com.parknquik.mobile', 'com.parknquik.web'])(
    'accepts configured audience %s', async (audience) => {
      const res = response();
      await appleAuth({ body: { appleToken: appleToken(audience) } }, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'parkpal-session' }));
      expect(signInWithSocialProfile).toHaveBeenCalledWith(expect.objectContaining({
        providerIdField: 'appleId', providerId: 'apple-user',
      }));
    }
  );

  test('rejects an unconfigured audience', async () => {
    const res = response();
    await appleAuth({ body: { appleToken: appleToken('other.services.id') } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(signInWithSocialProfile).not.toHaveBeenCalled();
  });

  test('rejects the web audience when no Services ID is configured', async () => {
    delete process.env.APPLE_WEB_CLIENT_ID;
    const res = response();
    await appleAuth({ body: { appleToken: appleToken('com.parknquik.web') } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(signInWithSocialProfile).not.toHaveBeenCalled();
  });

  test('preserves the existing-account conflict', async () => {
    signInWithSocialProfile.mockRejectedValueOnce(Object.assign(new Error('Use your existing sign-in method.'), { statusCode: 409 }));
    const res = response();
    await appleAuth({ body: { appleToken: appleToken('com.parknquik.web', 'existing@example.com') } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Use your existing sign-in method.' });
  });
});

describe('Facebook token verification', () => {
  const debugData = { is_valid: true, app_id: 'parkpal-meta-app', user_id: 'meta-user' };
  const profile = { id: 'meta-user', email: 'meta@example.com', name: 'Meta User' };

  test('accepts a valid token for the configured app and matching profile', async () => {
    axios.get.mockReset();
    axios.get.mockResolvedValueOnce({ data: { data: debugData } });
    axios.get.mockResolvedValueOnce({ data: profile });
    const res = response();
    await facebookAuth({ body: { facebookToken: 'meta-token' } }, res, jest.fn());

    expect(axios.get).toHaveBeenNthCalledWith(1, 'https://graph.facebook.com/debug_token', {
      params: { input_token: 'meta-token', access_token: 'parkpal-meta-app|test-secret' },
    });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'parkpal-session' }));
    expect(signInWithSocialProfile).toHaveBeenCalledWith(expect.objectContaining({ providerId: 'meta-user' }));
  });

  test.each([
    [{ ...debugData, is_valid: false }, 'invalid'],
    [{ ...debugData, app_id: 'another-app' }, 'other app'],
    [{ ...debugData, user_id: null }, 'missing user'],
  ])('rejects %s debugger data before profile lookup', async (data) => {
    axios.get.mockReset();
    axios.get.mockResolvedValueOnce({ data: { data } });
    const res = response();
    await facebookAuth({ body: { facebookToken: 'meta-token' } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(signInWithSocialProfile).not.toHaveBeenCalled();
  });

  test('rejects a profile belonging to another user', async () => {
    axios.get.mockReset();
    axios.get.mockResolvedValueOnce({ data: { data: debugData } });
    axios.get.mockResolvedValueOnce({ data: { ...profile, id: 'other-user' } });
    const res = response();
    await facebookAuth({ body: { facebookToken: 'meta-token' } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(signInWithSocialProfile).not.toHaveBeenCalled();
  });

  test('fails closed when server-side app credentials are absent', async () => {
    delete process.env.FACEBOOK_APP_SECRET;
    const res = response();
    await facebookAuth({ body: { facebookToken: 'meta-token' } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(503);
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('preserves the existing-account conflict', async () => {
    axios.get.mockReset();
    axios.get.mockResolvedValueOnce({ data: { data: debugData } });
    axios.get.mockResolvedValueOnce({ data: profile });
    signInWithSocialProfile.mockRejectedValueOnce(Object.assign(new Error('Use your existing sign-in method.'), { statusCode: 409 }));
    const res = response();
    await facebookAuth({ body: { facebookToken: 'meta-token' } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Use your existing sign-in method.' });
  });
});
