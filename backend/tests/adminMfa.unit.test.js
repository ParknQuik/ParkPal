const { generateSecret, totp, verifyTotp, generateRecoveryCodes, encryptTotpSecret, decryptTotpSecret, hashRecoveryCode, localMfaBypass } = require('../services/adminMfa');

describe('admin MFA primitives', () => {
  it('verifies valid TOTP values and rejects invalid values', () => {
    const secret = generateSecret();
    const now = 1_800_000_000_000;
    expect(verifyTotp(secret, totp(secret, now), now)).toBe(true);
    expect(verifyTotp(secret, '00000x', now)).toBe(false);
  });

  it('generates unique one-time recovery codes', () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    expect(codes.every((code) => /^[a-f0-9]{16}$/.test(code))).toBe(true);
  });

  it('encrypts TOTP secrets and stores only keyed recovery-code digests', () => {
    const secret = generateSecret();
    const ciphertext = encryptTotpSecret(secret);
    expect(ciphertext).not.toContain(secret);
    expect(decryptTotpSecret(ciphertext)).toBe(secret);
    expect(hashRecoveryCode('recoverycode1234')).not.toBe('recoverycode1234');
  });

  it('allows the MFA bypass only when explicitly enabled outside production', () => {
    const original = { nodeEnv: process.env.NODE_ENV, bypass: process.env.ADMIN_MFA_LOCAL_BYPASS, databaseUrl: process.env.DATABASE_URL, service: process.env.K_SERVICE, revision: process.env.K_REVISION };
    process.env.NODE_ENV = 'development'; process.env.ADMIN_MFA_LOCAL_BYPASS = 'true';
    process.env.DATABASE_URL = 'postgresql://localhost/test';
    expect(localMfaBypass()).toBe(true);
    process.env.K_SERVICE = 'parkpal-backend-dev';
    expect(localMfaBypass()).toBe(false);
    delete process.env.K_SERVICE;
    process.env.NODE_ENV = 'staging';
    expect(localMfaBypass()).toBe(false);
    process.env.NODE_ENV = 'production';
    expect(localMfaBypass()).toBe(false);
    process.env.NODE_ENV = original.nodeEnv;
    if (original.bypass === undefined) delete process.env.ADMIN_MFA_LOCAL_BYPASS;
    else process.env.ADMIN_MFA_LOCAL_BYPASS = original.bypass;
    if (original.databaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = original.databaseUrl;
    if (original.service === undefined) delete process.env.K_SERVICE;
    else process.env.K_SERVICE = original.service;
    if (original.revision === undefined) delete process.env.K_REVISION;
    else process.env.K_REVISION = original.revision;
  });
});
