jest.mock('../config/prisma', () => ({
  user: { findUnique: jest.fn(), create: jest.fn() },
}));
jest.mock('../services/auth', () => ({
  generateToken: jest.fn(),
  hashPassword: jest.fn(),
}));
jest.mock('../services/adminMfa', () => ({ localMfaBypass: jest.fn() }));

const prisma = require('../config/prisma');
const { generateToken } = require('../services/auth');
const { localMfaBypass } = require('../services/adminMfa');
const { signInWithSocialProfile } = require('../services/socialAuthService');

beforeEach(() => {
  prisma.user.findUnique.mockReset();
  prisma.user.create.mockReset();
  generateToken.mockReset().mockResolvedValue('parkpal-session');
  localMfaBypass.mockReset().mockReturnValue(false);
});

test('refuses to link a provider to an existing email account', async () => {
  prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'existing-user' });

  await expect(signInWithSocialProfile({
    providerIdField: 'facebookId',
    providerId: 'meta-user',
    email: 'existing@example.com',
  })).rejects.toMatchObject({
    statusCode: 409,
    message: expect.stringMatching(/existing sign-in method/i),
  });

  expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, {
    where: { email: 'existing@example.com' },
  });
  expect(prisma.user.create).not.toHaveBeenCalled();
});

test.each([
  [true, true, false],
  [false, false, true],
])('preserves admin security flags when MFA enrollment is %s', async (mfaEnabled, mfaRequired, mfaEnrollmentRequired) => {
  const user = {
    id: 7,
    email: 'admin@example.com',
    role: 'admin',
    isActive: true,
    isPlatformOwner: true,
    mfaEnabled,
    mustChangePassword: true,
    googleId: 'google-admin',
  };
  prisma.user.findUnique.mockResolvedValueOnce(user);

  const result = await signInWithSocialProfile({
    providerIdField: 'googleId',
    providerId: 'google-admin',
  });

  expect(generateToken).toHaveBeenCalledWith(user, { mfaVerified: false });
  expect(result).toMatchObject({
    token: 'parkpal-session',
    user: {
      id: 7,
      isPlatformOwner: true,
      mfaEnabled,
      mustChangePassword: true,
    },
    mfaRequired,
    mfaEnrollmentRequired,
    mustChangePassword: true,
  });
});

test('marks a driver social session as MFA verified', async () => {
  const user = { id: 8, email: 'driver@example.com', role: 'driver', isActive: true, facebookId: 'meta-driver' };
  prisma.user.findUnique.mockResolvedValueOnce(user);

  const result = await signInWithSocialProfile({ providerIdField: 'facebookId', providerId: 'meta-driver' });

  expect(generateToken).toHaveBeenCalledWith(user, { mfaVerified: true });
  expect(result).toMatchObject({
    user: { isPlatformOwner: false, mfaEnabled: false, mustChangePassword: false },
    mfaRequired: false,
    mfaEnrollmentRequired: false,
    mustChangePassword: false,
  });
});
