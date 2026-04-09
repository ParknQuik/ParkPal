const axios = require('axios');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { generateToken, hashPassword } = require('../services/auth');

const GOOGLE_TOKEN_INFO_URL = 'https://www.googleapis.com/oauth2/v3/tokeninfo';

exports.googleAuth = async (req, res) => {
  try {
    const { code, googleToken } = req.body;

    let googleUser;

    if (code) {
      // Exchange authorization code for tokens server-side
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI || 'parkpal://',
        grant_type: 'authorization_code',
      }).toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { id_token, access_token } = tokenResponse.data;
      const tokenToVerify = id_token || access_token;

      // Verify the token
      const verifyResponse = await axios.get(`${GOOGLE_TOKEN_INFO_URL}?id_token=${tokenToVerify}`);
      googleUser = verifyResponse.data;
    } else if (googleToken) {
      // Legacy: accept pre-exchanged token
      try {
        const verifyResponse = await axios.get(`${GOOGLE_TOKEN_INFO_URL}?id_token=${googleToken}`);
        googleUser = verifyResponse.data;
      } catch {
        const userinfoResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${googleToken}` }
        });
        googleUser = userinfoResponse.data;
      }
    } else {
      return res.status(400).json({ error: 'Authorization code or Google token is required' });
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
