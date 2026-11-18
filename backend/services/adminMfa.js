const crypto = require('crypto');

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(input) {
  let bits = 0;
  let value = 0;
  const output = [];
  for (const char of input.replace(/=+$/g, '').toUpperCase()) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error('Invalid TOTP secret');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function generateSecret() { return base32Encode(crypto.randomBytes(20)); }
function encryptionKey() {
  const encoded = process.env.ADMIN_MFA_ENCRYPTION_KEY;
  const key = encoded ? Buffer.from(encoded, 'base64') : Buffer.alloc(0);
  if (key.length !== 32 || key.toString('base64') !== encoded) {
    throw new Error('ADMIN_MFA_ENCRYPTION_KEY must be a base64 encoded 32-byte key');
  }
  return key;
}
function encryptTotpSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}
function decryptTotpSecret(value) {
  const [version, ivText, tagText, encryptedText] = String(value || '').split('.');
  if (version !== 'v1' || !ivText || !tagText || !encryptedText) throw new Error('Invalid encrypted MFA secret');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, 'base64url')), decipher.final()]).toString('utf8');
}
function hashRecoveryCode(code) {
  return crypto.createHmac('sha256', encryptionKey()).update(`parknquik-admin-recovery:${code}`).digest('hex');
}
function totp(secret, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 30000);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 15;
  const code = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(code).padStart(6, '0');
}
function matchedTotpCounter(secret, code, timestamp = Date.now()) {
  if (!/^\d{6}$/.test(String(code || ''))) return null;
  const currentCounter = Math.floor(timestamp / 30000);
  for (const window of [-1, 0, 1]) {
    const counter = currentCounter + window;
    if (crypto.timingSafeEqual(Buffer.from(totp(secret, counter * 30000)), Buffer.from(String(code)))) return counter;
  }
  return null;
}
function verifyTotp(secret, code, timestamp = Date.now()) { return matchedTotpCounter(secret, code, timestamp) !== null; }
function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => crypto.randomBytes(8).toString('hex'));
}
function isVerifiedLocalRuntime() {
  if (process.env.K_SERVICE || process.env.K_REVISION || process.env.CLOUD_RUN_JOB) return false;
  if (process.env.NODE_ENV === 'test') return true;
  if (process.env.NODE_ENV !== 'development' || !process.env.DATABASE_URL) return false;
  try {
    const host = new URL(process.env.DATABASE_URL).hostname;
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host);
  } catch {
    return false;
  }
}

function localMfaBypass() {
  return process.env.ADMIN_MFA_LOCAL_BYPASS === 'true' && isVerifiedLocalRuntime();
}

module.exports = { generateSecret, totp, verifyTotp, matchedTotpCounter, generateRecoveryCodes, encryptTotpSecret, decryptTotpSecret, hashRecoveryCode, isVerifiedLocalRuntime, localMfaBypass };
