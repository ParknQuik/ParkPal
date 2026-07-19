const crypto = require('crypto');
const prisma = require('../config/prisma');
const { generateToken, hashPassword } = require('./auth');

const buildUserResponse = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  profileImageUrl: user.profileImageUrl,
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

  if (!email) {
    throw Object.assign(new Error('Email is required from social provider'), { statusCode: 401 });
  }

  let user = await prisma.user.findUnique({
    where: { [providerIdField]: providerId },
  });

  if (!user) {
    user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          [providerIdField]: providerId,
          ...(profileImageUrl ? { profileImageUrl } : {}),
        },
      });
    } else {
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
  }

  if (!user.isActive) {
    throw Object.assign(new Error('Account is deactivated'), { statusCode: 403 });
  }

  return {
    token: await generateToken(user),
    user: buildUserResponse(user),
  };
};

module.exports = {
  signInWithSocialProfile,
};
