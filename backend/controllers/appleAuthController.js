const axios = require('axios');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { signInWithSocialProfile } = require('../services/socialAuthService');

const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';
const DEFAULT_APPLE_AUDIENCE = 'com.parknquik.mobile';

let cachedAppleKeys;

const getAppleSigningKeys = async () => {
  if (cachedAppleKeys) {
    return cachedAppleKeys;
  }

  const response = await axios.get(APPLE_KEYS_URL);
  cachedAppleKeys = response.data.keys || [];
  return cachedAppleKeys;
};

const getApplePublicKey = async (token) => {
  const decoded = jwt.decode(token, { complete: true });
  const kid = decoded?.header?.kid;

  if (!kid) {
    throw new Error('Apple token missing key id');
  }

  const keys = await getAppleSigningKeys();
  const jwk = keys.find((key) => key.kid === kid);

  if (!jwk) {
    throw new Error('Apple signing key not found');
  }

  return crypto.createPublicKey({ key: jwk, format: 'jwk' });
};

const getAppleAudience = () =>
  process.env.APPLE_CLIENT_ID ||
  process.env.APPLE_BUNDLE_ID ||
  DEFAULT_APPLE_AUDIENCE;

exports.appleAuth = async (req, res, next) => {
  try {
    const { appleToken, fullName, email } = req.body;

    if (!appleToken) {
      return res.status(400).json({ error: 'Apple token is required' });
    }

    let appleUser;

    try {
      const publicKey = await getApplePublicKey(appleToken);
      appleUser = jwt.verify(appleToken, publicKey, {
        algorithms: ['RS256'],
        audience: getAppleAudience(),
        issuer: APPLE_ISSUER,
      });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid Apple token' });
    }

    const result = await signInWithSocialProfile({
      providerIdField: 'appleId',
      providerId: appleUser.sub,
      email: appleUser.email || email,
      name: fullName,
    });

    res.json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    next(error);
  }
};
