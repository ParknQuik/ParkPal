const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * Generate a unique QR code string for a parking slot
 * @param {string} slotId - The parking slot ID
 * @returns {string} Unique QR code string
 */
exports.generateQRCodeData = (slotId) => {
  // Create a unique identifier combining slot ID and timestamp
  const timestamp = Date.now();
  const secret = process.env.QR_SECRET || 'parkpal-secret';

  // Create hash for verification
  const hash = crypto
    .createHmac('sha256', secret)
    .update(`${slotId}-${timestamp}`)
    .digest('hex')
    .substring(0, 8);

  // Format: PARKPAL:{slotId}:{timestamp}:{hash}
  return `PARKPAL:${slotId}:${timestamp}:${hash}`;
};

/**
 * Generate QR code image as base64 string
 * @param {string} slotId - The parking slot ID
 * @returns {Promise<string>} Base64 encoded QR code image
 */
exports.generateQRCodeImage = async (slotId) => {
  try {
    const qrData = exports.generateQRCodeData(slotId);

    // Generate QR code as data URL (base64)
    const qrImage = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
    });

    return qrImage;
  } catch (error) {
    throw new Error(`QR code generation failed: ${error.message}`);
  }
};

/**
 * Validate QR code data
 * @param {string} qrData - The scanned QR code data
 * @returns {object} Validation result with slotId if valid
 */
exports.validateQRCode = (qrData) => {
  try {
    // Expected format: PARKPAL:{slotId}:{timestamp}:{hash}
    const parts = qrData.split(':');

    if (parts.length !== 4 || parts[0] !== 'PARKPAL') {
      return { valid: false, error: 'Invalid QR code format' };
    }

    const [, slotId, timestamp, providedHash] = parts;
    const secret = process.env.QR_SECRET || 'parkpal-secret';

    // Verify hash
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(`${slotId}-${timestamp}`)
      .digest('hex')
      .substring(0, 8);

    if (providedHash !== expectedHash) {
      return { valid: false, error: 'QR code verification failed' };
    }

    // Check if QR code is not too old (optional: 30 days expiry)
    const qrAge = Date.now() - parseInt(timestamp);
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    if (qrAge > maxAge) {
      return { valid: false, error: 'QR code has expired' };
    }

    return {
      valid: true,
      slotId: slotId,
      generatedAt: new Date(parseInt(timestamp)),
    };
  } catch (error) {
    return { valid: false, error: 'QR code parsing failed' };
  }
};

/**
 * Generate QR code as buffer (for saving to file/storage)
 * @param {string} slotId - The parking slot ID
 * @returns {Promise<Buffer>} QR code image buffer
 */
exports.generateQRCodeBuffer = async (slotId) => {
  try {
    const qrData = exports.generateQRCodeData(slotId);
    const buffer = await QRCode.toBuffer(qrData, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 300,
      margin: 2,
    });

    return buffer;
  } catch (error) {
    throw new Error(`QR code generation failed: ${error.message}`);
  }
};
