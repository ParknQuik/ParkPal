const axios = require('axios');
const { signInWithSocialProfile } = require('../services/socialAuthService');

exports.facebookAuth = async (req, res, next) => {
  try {
    const { facebookToken } = req.body;

    if (!facebookToken) {
      return res.status(400).json({ error: 'Facebook token is required' });
    }

    const { FACEBOOK_APP_ID: appId, FACEBOOK_APP_SECRET: appSecret } = process.env;
    if (!appId || !appSecret) {
      return res.status(503).json({ error: 'Facebook sign-in is not configured' });
    }

    let facebookUser;

    try {
      const debugResponse = await axios.get('https://graph.facebook.com/debug_token', {
        params: {
          input_token: facebookToken,
          access_token: `${appId}|${appSecret}`,
        },
      });
      const tokenData = debugResponse.data?.data;
      if (!tokenData?.is_valid || String(tokenData.app_id) !== appId || !tokenData.user_id) {
        return res.status(401).json({ error: 'Invalid Facebook token' });
      }

      const response = await axios.get('https://graph.facebook.com/me', {
        params: {
          access_token: facebookToken,
          fields: 'id,name,email,picture.type(large)',
        },
      });
      facebookUser = response.data;
      if (String(facebookUser?.id) !== String(tokenData.user_id)) {
        return res.status(401).json({ error: 'Invalid Facebook token' });
      }
    } catch (error) {
      return res.status(401).json({ error: 'Invalid Facebook token' });
    }

    const result = await signInWithSocialProfile({
      providerIdField: 'facebookId',
      providerId: facebookUser.id,
      email: facebookUser.email,
      name: facebookUser.name,
      profileImageUrl: facebookUser.picture?.data?.url,
    });

    res.json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    next(error);
  }
};
