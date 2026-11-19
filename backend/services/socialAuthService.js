const crypto = require('crypto');
const prisma = require('../config/prisma');
const { generateToken, hashPassword } = require('./auth');
const { localMfaBypass } = require('./adminMfa');

const buildUserResponse = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  canHost: user.canHost ?? false,
  isPlatformOwner: user.isPlatformOwner ?? false,
  mfaEnabled: user.mfaEnabled ?? false,
  mustChangePassword: user.mustChangePassword ?? false,
  phone: user.phone ?? null,
  profileImageUrl: user.profileImageUrl ?? null,
});

const createRandomPasswordHash = async () => {
  const randomPassword = crypto.randomBytes(32).toString('hex');
  return hashPassword(randomPassword);
};

const signInWithSocialProfile = async ({
  providerIdField,
  providerId,
  email,
  name,
  profileImageUrl,
}) => {
  if (!providerId) {
    throw Object.assign(new Error('Missing social provider id'), { statusCode: 401 });
  }

  let user = await prisma.user.findUnique({
    where: { [providerIdField]: providerId },
  });

  if (!user) {
    if (!email) {
      throw Object.assign(new Error('Email is required from social provider'), { statusCode: 401 });
    }
    const emailOwner = await prisma.user.findUnique({ where: { email } });
    if (emailOwner) {
      throw Object.assign(
        new Error('An account with this email already exists. Use your existing sign-in method.'),
        { statusCode: 409 }
      );
    }
    user = await prisma.user.create({
      data: {
        name: name || email.split('@')[0],
        email,
        [providerIdField]: providerId,
        password: await createRandomPasswordHash(),
        role: 'driver',
        profileImageUrl,
      },
    });
  }

  if (!user.isActive) {
    throw Object.assign(new Error('Account is deactivated'), { statusCode: 403 });
  }

  const mfaRequired = user.role === 'admin' && !localMfaBypass();

  return {
    token: await generateToken(user, { mfaVerified: !mfaRequired }),
    user: buildUserResponse(user),
    mfaRequired: mfaRequired && user.mfaEnabled,
    mfaEnrollmentRequired: mfaRequired && !user.mfaEnabled,
    mustChangePassword: user.mustChangePassword ?? false,
  };
};

module.exports = {
  signInWithSocialProfile,
};
