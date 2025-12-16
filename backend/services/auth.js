const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const secretManager = require('../config/secretManager');

// Optional: Load hibp package for breached password checking
let pwnedPassword;
try {
  pwnedPassword = require('hibp').pwnedPassword;
} catch (err) {
  console.warn('hibp package not installed - skipping breached password checking');
}

// Cache JWT secret to avoid fetching on every request
let jwtSecretCache = null;

async function getJwtSecret() {
  if (jwtSecretCache) {
    return jwtSecretCache;
  }

  const secret = await secretManager.getSecret('jwt-secret');

  // Validate JWT secret
  if (!secret ||
      secret === 'test_jwt_secret_for_development_only_do_not_use_in_production_12345678' ||
      secret === 'your-super-secret-jwt-key-min-128-characters-here') {
    console.warn('⚠️  JWT_SECRET is not properly configured - using development fallback');
  }

  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  jwtSecretCache = secret;
  return secret;
}

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const jwtSecret = await getJwtSecret();

    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) return res.status(401).json({ error: 'Invalid token' });
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(500).json({ error: 'Authentication system error' });
  }
};

exports.generateToken = async (user) => {
  const jwtSecret = await getJwtSecret();

  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: '24h' }
  );
};

exports.validatePassword = async (password, options = {}) => {
  const {
    checkBreachedPasswords = true,
    minLength = 8,
    maxLength = 72, // bcrypt limitation
  } = options;

  const warnings = [];

  // Basic checks
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  // Trim check (allow spaces but not only spaces)
  const trimmedPassword = password.trim();
  if (trimmedPassword.length === 0) {
    return { valid: false, error: 'Password cannot be only whitespace' };
  }

  // Length requirements
  if (password.length < minLength) {
    return {
      valid: false,
      error: `Password must be at least ${minLength} characters long`
    };
  }

  if (password.length > maxLength) {
    return {
      valid: false,
      error: `Password must not exceed ${maxLength} characters`
    };
  }

  // Complexity requirements
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter'
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one number'
    };
  }

  // Optional: Check for special characters (informational only)
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    warnings.push('Consider adding special characters for extra security');
  }

  // Warn if password is short (recommend 12+ per OWASP)
  if (password.length < 12) {
    warnings.push('For better security, consider using at least 12 characters');
  }

  // Optional: Check for repeated characters (3+ in a row)
  if (/(.)\1{2,}/.test(password)) {
    warnings.push('Avoid using repeated characters');
  }

  // Check against breached passwords (CRITICAL)
  if (checkBreachedPasswords && pwnedPassword) {
    try {
      const pwnedCount = await pwnedPassword(password);
      if (pwnedCount > 0) {
        return {
          valid: false,
          error: 'This password has been exposed in data breaches. Please choose a different password.'
        };
      }
    } catch (err) {
      // Don't block registration if HIBP is down, but log it
      console.error('Failed to check password against breach database:', err.message);
      warnings.push('Unable to verify password against breach database');
    }
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
};

exports.hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

exports.comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};
