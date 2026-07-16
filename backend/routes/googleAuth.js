const googleAuthController = require('../controllers/googleAuthController');
const { asyncHandler } = require('../middleware/errorHandler');

module.exports = (app, authLimiter) => {
  /**
   * @swagger
   * /api/v1/auth/google:
   *   post:
   *     summary: Sign in with Google
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - googleToken
   *             properties:
   *               googleToken:
   *                 type: string
   *                 description: Canonical mobile path. The Google OAuth id_token returned by native Google Sign-In.
   *                 example: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
   *               code:
   *                 type: string
   *                 description: Legacy browser OAuth authorization code. Prefer googleToken for mobile.
   *     responses:
   *       200:
   *         description: Login successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token:
   *                   type: string
   *                 user:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: integer
   *                     name:
   *                       type: string
   *                     email:
   *                       type: string
   *                     role:
   *                       type: string
   *       400:
   *         description: Missing Google token
   *       401:
   *         description: Invalid Google token
   */
  app.post('/auth/google', authLimiter, asyncHandler(googleAuthController.googleAuth));
};
