const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken: mockVerifyIdToken })),
}));
jest.mock('../services/socialAuthService', () => ({ signInWithSocialProfile: jest.fn() }));

const { signInWithSocialProfile } = require('../services/socialAuthService');
const { googleAuth } = require('../controllers/googleAuthController');

const originalMobileClientId = process.env.GOOGLE_CLIENT_ID;
const originalWebClientId = process.env.GOOGLE_WEB_CLIENT_ID;

const response = () => {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
};

beforeEach(() => {
  process.env.GOOGLE_CLIENT_ID = 'mobile-client-id';
  process.env.GOOGLE_WEB_CLIENT_ID = 'web-client-id';
  mockVerifyIdToken.mockReset();
  signInWithSocialProfile.mockReset();
  signInWithSocialProfile.mockResolvedValue({ token: 'parkpal-session' });
});

afterAll(() => {
  if (originalMobileClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = originalMobileClientId;
  if (originalWebClientId === undefined) delete process.env.GOOGLE_WEB_CLIENT_ID;
  else process.env.GOOGLE_WEB_CLIENT_ID = originalWebClientId;
});

test('verifies Google ID tokens against mobile and configured web client IDs', async () => {
  mockVerifyIdToken.mockResolvedValue({ getPayload: () => ({ sub: 'google-user', email: 'google@example.com' }) });
  const res = response();

  await googleAuth({ body: { googleToken: 'signed-google-token' } }, res, jest.fn());

  expect(mockVerifyIdToken).toHaveBeenCalledWith({
    idToken: 'signed-google-token',
    audience: ['mobile-client-id', 'web-client-id'],
  });
  expect(res.json).toHaveBeenCalledWith({ token: 'parkpal-session' });
});

test('keeps rejecting tokens that fail Google verification', async () => {
  mockVerifyIdToken.mockRejectedValue(new Error('unexpected audience'));
  const res = response();

  await googleAuth({ body: { googleToken: 'other-client-token' } }, res, jest.fn());

  expect(res.status).toHaveBeenCalledWith(401);
  expect(signInWithSocialProfile).not.toHaveBeenCalled();
});

test('uses only the mobile client ID when no web client ID is configured', async () => {
  delete process.env.GOOGLE_WEB_CLIENT_ID;
  mockVerifyIdToken.mockResolvedValue({ getPayload: () => ({ sub: 'google-user', email: 'google@example.com' }) });

  await googleAuth({ body: { googleToken: 'signed-google-token' } }, response(), jest.fn());

  expect(mockVerifyIdToken).toHaveBeenCalledWith(expect.objectContaining({ audience: ['mobile-client-id'] }));
});

test('does not verify a token without any configured Google audience', async () => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_WEB_CLIENT_ID;
  const res = response();

  await googleAuth({ body: { googleToken: 'unsigned-token' } }, res, jest.fn());

  expect(res.status).toHaveBeenCalledWith(503);
  expect(mockVerifyIdToken).not.toHaveBeenCalled();
  expect(signInWithSocialProfile).not.toHaveBeenCalled();
});
