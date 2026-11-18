const { loginSchema, registerSchema } = require('../validators/auth');

describe('auth email validation', () => {
  const originalEnv = {};
  const envKeys = ['NODE_ENV', 'DATABASE_URL', 'K_SERVICE', 'K_REVISION', 'CLOUD_RUN_JOB'];

  beforeEach(() => {
    for (const key of envKeys) originalEnv[key] = process.env[key];
    for (const key of envKeys) delete process.env[key];
  });

  afterEach(() => {
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  const validateLoginEmail = (email) => loginSchema.validate({ email, password: 'secret' }).error;

  it('accepts the bootstrapped address in a test runtime', () => {
    process.env.NODE_ENV = 'test';
    expect(validateLoginEmail('admin@localhost.test')).toBeUndefined();
  });

  it('accepts standard email addresses in production', () => {
    process.env.NODE_ENV = 'production';
    expect(validateLoginEmail('admin@example.com')).toBeUndefined();
  });

  it('rejects malformed local addresses', () => {
    process.env.NODE_ENV = 'test';
    expect(validateLoginEmail('admin@@localhost.test')).toBeDefined();
    expect(validateLoginEmail('@localhost.test')).toBeDefined();
  });

  it('rejects the reserved local address in production and Cloud Run', () => {
    process.env.NODE_ENV = 'production';
    expect(validateLoginEmail('admin@localhost.test')).toBeDefined();

    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/app';
    process.env.K_SERVICE = 'parkpal-api';
    expect(validateLoginEmail('admin@localhost.test')).toBeDefined();
  });

  it('allows the local address in development only with a loopback database', () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'postgresql://user:pass@127.0.0.1:5432/app';
    expect(validateLoginEmail('admin@localhost.test')).toBeUndefined();

    process.env.DATABASE_URL = 'postgresql://user:pass@db.internal:5432/app';
    expect(validateLoginEmail('admin@localhost.test')).toBeDefined();
  });

  it('keeps public registration validation unchanged', () => {
    process.env.NODE_ENV = 'test';
    const result = registerSchema.validate({
      name: 'Local Admin',
      email: 'admin@localhost.test',
      password: 'AdminPass123!',
    });
    expect(result.error).toBeDefined();
    expect(result.error.details.some(({ type }) => type === 'string.email')).toBe(true);
  });
});
