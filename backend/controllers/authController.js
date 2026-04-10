const prisma = require('../config/prisma');
const crypto = require('crypto');
const { generateToken, hashPassword, comparePassword, validatePassword } = require('../services/auth');
const { sendPasswordResetEmail } = require('../services/email');

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.validatedData;

    // Async password validation (for breached password check)
    const passwordValidation = await validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role
      }
    });

    const token = await generateToken(user);

    const response = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    };

    // Include warnings if any
    if (passwordValidation.warnings) {
      response.warnings = passwordValidation.warnings;
    }

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.validatedData;
    const userId = req.user.id;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    const isValidOldPassword = await comparePassword(oldPassword, user.password);
    if (!isValidOldPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Validate new password (for breached password check)
    const passwordValidation = await validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Hash and update
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        updatedAt: new Date()
      }
    });

    const response = { message: 'Password changed successfully' };

    if (passwordValidation.warnings) {
      response.warnings = passwordValidation.warnings;
    }

    res.json(response);
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await comparePassword(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = await generateToken(user);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get current user
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        profileImageUrl: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Logout user
 */
exports.logout = async (req, res) => {
  try {
    // If using JWT blacklist or refresh tokens, invalidate them here
    // For now, logout is handled client-side by removing the token
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Forgot password - Send reset token via email
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.validatedData;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Always return success message (security: don't reveal if email exists)
    // This prevents email enumeration attacks
    const successMessage = 'If an account exists with that email, a password reset link has been sent.';

    if (!user) {
      return res.json({ message: successMessage });
    }

    // Generate reset token (32 bytes = 64 hex characters)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Set expiry to 1 hour from now
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    // Save token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires
      }
    });

    // Send email
    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Don't expose email sending failures to client
    }

    res.json({ message: successMessage });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
};

/**
 * Reset password - Validate token and update password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.validatedData;

    // Find user with valid token
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date() // Token not expired
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired reset token. Please request a new password reset.'
      });
    }

    // Validate new password (HIBP breach check)
    const passwordValidation = await validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        updatedAt: new Date()
      }
    });

    const response = { message: 'Password reset successfully. You can now log in with your new password.' };

    // Include warnings if any
    if (passwordValidation.warnings) {
      response.warnings = passwordValidation.warnings;
    }

    res.json(response);
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
