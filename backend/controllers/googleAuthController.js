const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const { signInWithSocialProfile } = require('../services/socialAuthService');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.googleAuth = async (req, res, next) => {
  try {
    const { code, googleToken } = req.body;

    let googleUser;

    if (googleToken) {
      try {
        const ticket = await client.verifyIdToken({
          idToken: googleToken,
          audience: process.env.GOOGLE_CLIENT_ID
        });
        googleUser = ticket.getPayload();
      } catch (error) {
        return res.status(401).json({ error: 'Invalid Google token' });
      }
    } else if (code) {
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
    } else {
      return res.status(400).json({ error: 'Authorization code or Google token is required' });
    }

    if (!googleUser || !googleUser.sub) {
      return res.status(401).json({ error: 'Invalid Google token payload' });
    }

    const { sub: googleId, email, name, picture } = googleUser;
    const result = await signInWithSocialProfile({
      providerIdField: 'googleId',
      providerId: googleId,
      email,
      name,
      profileImageUrl: picture,
    });

    res.json(result);
   } catch (error) {
     if (error.statusCode) {
       return res.status(error.statusCode).json({ error: error.message });
     }

     next(error);
   }
};
