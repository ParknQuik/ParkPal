const { requireAdmin, requirePlatformOwner } = require('../middleware/adminGuard');

describe('admin authorization gates', () => {
  const response = { status: jest.fn(() => response), json: jest.fn(() => response) };
  const originalBypass = process.env.ADMIN_MFA_LOCAL_BYPASS;
  beforeEach(() => { response.status.mockClear(); response.json.mockClear(); process.env.ADMIN_MFA_LOCAL_BYPASS = 'false'; });
  afterAll(() => {
    if (originalBypass === undefined) delete process.env.ADMIN_MFA_LOCAL_BYPASS;
    else process.env.ADMIN_MFA_LOCAL_BYPASS = originalBypass;
  });

  it('rejects non-admins and admins without verified MFA', () => {
    const next = jest.fn();
    requireAdmin({ user: { role: 'driver' } }, response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    next.mockClear();
    requireAdmin({ user: { role: 'admin', mfaVerified: false } }, response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('requires the distinct platform owner capability', () => {
    const next = jest.fn();
    requirePlatformOwner({ user: { role: 'admin', isPlatformOwner: false, mfaVerified: true } }, response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    next.mockClear();
    requirePlatformOwner({ user: { role: 'admin', isPlatformOwner: true, mfaVerified: true } }, response, next);
    expect(next).toHaveBeenCalledWith();
  });
});
