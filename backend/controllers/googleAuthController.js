const axios = require('axios');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../config/prisma');
const { generateToken, hashPassword } = require('../services/auth');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleAuth = async (req, res, next) => {
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

      // Verify the token with audience validation
      try {
        const ticket = await client.verifyIdToken({
          idToken: tokenToVerify,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        googleUser = ticket.getPayload();
      } catch (error) {
        return res.status(401).json({ error: 'Invalid Google token' });
      }
     } else if (googleToken) {
       // Legacy: accept pre-exchanged token
       try {
         const ticket = await client.verifyIdToken({
           idToken: googleToken,
           audience: process.env.GOOGLE_CLIENT_ID
         });
         googleUser = ticket.getPayload();
       } catch (error) {
         return res.status(401).json({ error: 'Invalid Google token' });
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
            role: 'user',
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
     next(error);
   }
};
