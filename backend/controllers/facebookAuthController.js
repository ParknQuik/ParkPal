const axios = require('axios');
const { signInWithSocialProfile } = require('../services/socialAuthService');

exports.facebookAuth = async (req, res, next) => {
  try {
    const { facebookToken } = req.body;

    if (!facebookToken) {
      return res.status(400).json({ error: 'Facebook token is required' });
    }

    let facebookUser;

    try {
      const response = await axios.get('https://graph.facebook.com/me', {
        params: {
          access_token: facebookToken,
          fields: 'id,name,email,picture.type(large)',
        },
      });
      facebookUser = response.data;
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
