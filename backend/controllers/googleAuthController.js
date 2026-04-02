const axios = require('axios');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { generateToken, hashPassword } = require('../services/auth');

const GOOGLE_TOKEN_INFO_URL = 'https://www.googleapis.com/oauth2/v3/tokeninfo';

exports.googleAuth = async (req, res) => {
  try {
    const { googleToken } = req.body;

    if (!googleToken) {
      return res.status(400).json({ error: 'Google token is required' });
    }

    let googleUser;
    try {
      // Try as id_token first (standard approach)
      let response;
      try {
        response = await axios.get(`${GOOGLE_TOKEN_INFO_URL}?id_token=${googleToken}`);
        googleUser = response.data;
      } catch (idTokenError) {
        // If id_token validation fails, try as access_token
        // This handles cases where the client sends an OAuth access_token instead
        const accessTokenUrl = 'https://www.googleapis.com/oauth2/v3/userinfo';
        response = await axios.get(accessTokenUrl, {
          headers: { Authorization: `Bearer ${googleToken}` }
        });
        googleUser = response.data;
        // Normalize sub field for access_token response
        if (googleUser && googleUser.sub) {
          // userinfo endpoint returns the same structure
        }
      }
    } catch (error) {
      console.error('Google token verification failed:', error.message);
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    if (!googleUser || !googleUser.sub) {
      return res.status(401).json({ error: 'Invalid Google token payload' });
    }

    const { sub: googleId, email, name, picture } = googleUser;

    let user = await prisma.user.findUnique({
      where: { googleId }
    });

    if (!user) {
      user = await prisma.user.findUnique({
        where: { email }
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            profileImageUrl: picture
          }
        });
        user = await prisma.user.findUnique({
          where: { id: user.id }
        });
      } else {
        const randomPassword = crypto.randomBytes(32).toString('hex');
        user = await prisma.user.create({
          data: {
            name,
            email,
            googleId,
            password: await hashPassword(randomPassword),
            role: 'driver',
            profileImageUrl: picture
          }
        });
      }
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const token = await generateToken(user);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        profileImageUrl: user.profileImageUrl
      },
      token
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: error.message });
  }
};
