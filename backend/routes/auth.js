const authController = require('../controllers/authController');
const { authenticate } = require('../services/auth');
const { validateBody } = require('../middleware/validation');
const { registerSchema, loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } = require('../validators/auth');

module.exports = (app, authLimiter) => {
  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: Register a new user
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               name:
   *                 type: string
   *                 example: John Doe
   *               email:
   *                 type: string
   *                 format: email
   *                 example: john@example.com
   *               password:
   *                 type: string
   *                 format: password
   *                 example: password123
   *               role:
   *                 type: string
   *                 enum: [user, host, admin]
   *                 default: user
   *     responses:
   *       201:
   *         description: User created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token:
   *                   type: string
   *                 user:
   *                   $ref: '#/components/schemas/User'
   *       400:
   *         description: User already exists
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post('/auth/register', authLimiter, validateBody(registerSchema), authController.register);

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Login user
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: john@example.com
   *               password:
   *                 type: string
   *                 format: password
   *                 example: password123
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
   *                   $ref: '#/components/schemas/User'
   *       401:
   *         description: Invalid credentials
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  app.post('/auth/login', authLimiter, validateBody(loginSchema), authController.login);

  /**
   * @swagger
   * /api/auth/password:
   *   put:
   *     summary: Change user password
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - oldPassword
   *               - newPassword
   *             properties:
   *               oldPassword:
   *                 type: string
   *                 format: password
   *                 example: OldPassword123
   *               newPassword:
   *                 type: string
   *                 format: password
   *                 example: NewSecurePass456!
   *     responses:
   *       200:
   *         description: Password changed successfully
   *       400:
   *         description: Invalid password or same as old password
   *       401:
   *         description: Incorrect current password or unauthorized
   */
  app.put('/auth/password', authenticate, authLimiter, validateBody(changePasswordSchema), authController.changePassword);

  /**
   * @swagger
   * /api/auth/me:
   *   get:
   *     summary: Get current user information
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Current user data
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/User'
   *       401:
   *         description: Unauthorized
   */
  app.get('/auth/me', authenticate, authController.getCurrentUser);

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: Logout user
   *     tags: [Authentication]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logged out successfully
   */
  app.post('/auth/logout', authenticate, authController.logout);

  /**
   * @swagger
   * /api/auth/forgot-password:
   *   post:
   *     summary: Request password reset
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: john@example.com
   *     responses:
   *       200:
   *         description: Reset email sent (if account exists)
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *       400:
   *         description: Invalid email format
   */
  app.post('/auth/forgot-password', authLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword);

  /**
   * @swagger
   * /api/auth/reset-password:
   *   post:
   *     summary: Reset password with token
   *     tags: [Authentication]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - token
   *               - newPassword
   *             properties:
   *               token:
   *                 type: string
   *                 example: a1b2c3d4e5f6...
   *               newPassword:
   *                 type: string
   *                 format: password
   *                 example: NewSecurePass123!
   *     responses:
   *       200:
   *         description: Password reset successfully
   *       400:
   *         description: Invalid or expired token
   */
  app.post('/auth/reset-password', authLimiter, validateBody(resetPasswordSchema), authController.resetPassword);
};
