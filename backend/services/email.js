const nodemailer = require('nodemailer');

/**
 * Email Service for ParkPal
 *
 * Uses Nodemailer with Gmail SMTP for development
 * Switch to SendGrid for production (see commented code below)
 */

// Gmail SMTP Configuration (Development)
const createTransporter = () => {
  // For development: Use Gmail SMTP
  // You need to enable "Less secure app access" or use App Password
  // https://support.google.com/accounts/answer/185833

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Fallback: Log to console (for testing without SMTP)
  return {
    sendMail: async (mailOptions) => {
      console.log('📧 Email would be sent:');
      console.log('  To:', mailOptions.to);
      console.log('  Subject:', mailOptions.subject);
      console.log('  Body:', mailOptions.text);
      return { messageId: 'test-' + Date.now() };
    }
  };
};

/**
 * Send password reset email
 */
exports.sendPasswordResetEmail = async (email, name, resetToken) => {
  const transporter = createTransporter();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || '"ParkPal" <noreply@parkpal.com>',
    to: email,
    subject: 'Reset Your ParkPal Password',
    text: `Hi ${name || 'there'},

You requested to reset your password for ParkPal.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, please ignore this email.

Best regards,
ParkPal Team`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🅿️ ParkPal</h1>
    </div>
    <div class="content">
      <h2>Reset Your Password</h2>
      <p>Hi ${name || 'there'},</p>
      <p>You requested to reset your password for ParkPal.</p>
      <p>Click the button below to reset your password:</p>
      <a href="${resetUrl}" class="button">Reset Password</a>
      <p><strong>This link expires in 1 hour.</strong></p>
      <p>If you didn't request this password reset, please ignore this email.</p>
      <div class="footer">
        <p>Best regards,<br>ParkPal Team</p>
        <p style="margin-top: 20px;">This is an automated email. Please do not reply.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    throw new Error('Failed to send email');
  }
};

/**
 * Send booking confirmation email (for future use)
 */
exports.sendBookingConfirmationEmail = async (email, name, bookingDetails) => {
  // TODO: Implement when needed
  console.log('📧 Booking confirmation email (not implemented yet)');
  return { success: true };
};

// ============================================
// Production: SendGrid Alternative
// ============================================
/*
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.sendPasswordResetEmail = async (email, name, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const msg = {
    to: email,
    from: 'noreply@parkpal.com', // Must be verified in SendGrid
    subject: 'Reset Your ParkPal Password',
    text: `Hi ${name || 'there'}, ...`,
    html: `...`
  };

  try {
    await sgMail.send(msg);
    console.log('✅ Password reset email sent via SendGrid');
    return { success: true };
  } catch (error) {
    console.error('❌ SendGrid error:', error);
    throw new Error('Failed to send email');
  }
};
*/
