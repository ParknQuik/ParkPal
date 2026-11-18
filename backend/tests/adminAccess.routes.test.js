const express = require('express');
const request = require('supertest');
const { cleanDatabase, prisma } = require('./setup');

jest.mock('../services/email', () => ({ sendAdminInvitationEmail: jest.fn() }));
jest.mock('../services/auth', () => ({
  ...jest.requireActual('../services/auth'),
  validatePassword: jest.fn(async () => ({ valid: true })),
}));

const { sendAdminInvitationEmail } = require('../services/email');
const { authenticate, generateToken, hashPassword } = require('../services/auth');
const adminRoutes = require('../routes/admin');
const authRoutes = require('../routes/auth');
const { generateSecret, totp, encryptTotpSecret, hashRecoveryCode } = require('../services/adminMfa');

const app = express();
app.use(express.json());
adminRoutes(app);
const passLimiter = (_req, _res, next) => next();
authRoutes(app, { login: passLimiter, register: passLimiter, reset: passLimiter });
app.get('/session-check', authenticate, (req, res) => res.json(req.user));

describe('admin access lifecycle API', () => {
  let owner;
  let admin;
  let ownerToken;
  let adminToken;

  beforeAll(async () => {
    await cleanDatabase();
    const password = await hashPassword('TestPass123!');
    owner = await prisma.user.create({ data: { email: 'platform-owner@test.local', name: 'Owner', password, role: 'admin', isPlatformOwner: true } });
    admin = await prisma.user.create({ data: { email: 'ordinary-admin@test.local', name: 'Admin', password, role: 'admin' } });
    ownerToken = await generateToken(owner, { mfaVerified: true });
    adminToken = await generateToken(admin, { mfaVerified: true });
  });
  afterAll(async () => { await cleanDatabase(); await prisma.$disconnect(); });

  it('restricts access management to platform owners and prevents final owner deactivation', async () => {
    const denied = await request(app).get('/admin/access').set('Authorization', `Bearer ${adminToken}`);
    expect(denied.status).toBe(403);
    const finalOwner = await request(app).patch(`/admin/access/admins/${owner.id}`).set('Authorization', `Bearer ${ownerToken}`).send({ active: false });
    expect(finalOwner.status).toBe(409);
  });

  it('sends one invitation per email, accepts it once, and records the lifecycle', async () => {
    sendAdminInvitationEmail.mockClear();
    const sent = await request(app).post('/admin/access/invitations').set('Authorization', `Bearer ${ownerToken}`).send({ email: 'new-admin@test.local' });
    expect(sent.status).toBe(201);
    expect(sent.body).not.toHaveProperty('token');
    expect(sendAdminInvitationEmail).toHaveBeenCalledTimes(1);
    const secret = sendAdminInvitationEmail.mock.calls[0][1];
    const duplicate = await request(app).post('/admin/access/invitations').set('Authorization', `Bearer ${ownerToken}`).send({ email: 'new-admin@test.local' });
    expect(duplicate.status).toBe(409);
    const accepted = await request(app).post('/admin-invitations/accept').send({ token: secret, name: 'New Admin', password: 'TestPass123!' });
    expect(accepted.status).toBe(201);
    const replay = await request(app).post('/admin-invitations/accept').send({ token: secret, name: 'Replay', password: 'TestPass123!' });
    expect(replay.status).toBe(400);
    const audit = await prisma.adminAccessAudit.findMany({ where: { targetEmail: 'new-admin@test.local', action: { in: ['invitation_sent', 'invitation_accepted'] } } });
    expect(audit).toHaveLength(2);
  });

  it('revokes expired invitations and makes deactivation invalidate an existing token', async () => {
    sendAdminInvitationEmail.mockClear();
    const sent = await request(app).post('/admin/access/invitations').set('Authorization', `Bearer ${ownerToken}`).send({ email: 'revoked-admin@test.local' });
    const invitationId = sent.body.id;
    const secret = sendAdminInvitationEmail.mock.calls[0][1];
    const revoked = await request(app).delete(`/admin/access/invitations/${invitationId}`).set('Authorization', `Bearer ${ownerToken}`);
    expect(revoked.status).toBe(200);
    const rejected = await request(app).post('/admin-invitations/accept').send({ token: secret, name: 'Revoked', password: 'TestPass123!' });
    expect(rejected.status).toBe(400);
    const expiredInvite = await request(app).post('/admin/access/invitations').set('Authorization', `Bearer ${ownerToken}`).send({ email: 'expired-admin@test.local' });
    const expiredSecret = sendAdminInvitationEmail.mock.calls[1][1];
    await prisma.adminInvitation.update({ where: { id: expiredInvite.body.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const expired = await request(app).post('/admin-invitations/accept').send({ token: expiredSecret, name: 'Expired', password: 'TestPass123!' });
    expect(expired.status).toBe(400);

    const before = await request(app).get('/session-check').set('Authorization', `Bearer ${adminToken}`);
    expect(before.status).toBe(200);
    const deactivated = await request(app).patch(`/admin/access/admins/${admin.id}`).set('Authorization', `Bearer ${ownerToken}`).send({ active: false });
    expect(deactivated.status).toBe(200);
    const oldToken = await request(app).get('/session-check').set('Authorization', `Bearer ${adminToken}`);
    expect(oldToken.status).toBe(401);
    const reactivated = await request(app).patch(`/admin/access/admins/${admin.id}`).set('Authorization', `Bearer ${ownerToken}`).send({ active: true });
    expect(reactivated.status).toBe(200);
    const restored = await request(app).get('/session-check').set('Authorization', `Bearer ${adminToken}`);
    expect(restored.status).toBe(200);
    const audit = await prisma.adminAccessAudit.findFirst({ where: { actorId: owner.id, targetId: admin.id, action: 'admin_deactivated' } });
    expect(audit).toBeTruthy();
  });

  it('allows only acceptance or revocation to win when both race', async () => {
    sendAdminInvitationEmail.mockClear();
    const sent = await request(app).post('/admin/access/invitations').set('Authorization', `Bearer ${ownerToken}`).send({ email: 'racing-admin@test.local' });
    const secret = sendAdminInvitationEmail.mock.calls[0][1];
    const [accepted, revoked] = await Promise.all([
      request(app).post('/admin-invitations/accept').send({ token: secret, name: 'Race Admin', password: 'TestPass123!' }),
      request(app).delete(`/admin/access/invitations/${sent.body.id}`).set('Authorization', `Bearer ${ownerToken}`),
    ]);
    expect(
      (accepted.status === 201 && revoked.status === 404)
      || (accepted.status === 400 && revoked.status === 200),
    ).toBe(true);
  });

  it('consumes each accepted TOTP counter once, including concurrent challenges', async () => {
    const secret = generateSecret();
    await prisma.user.update({ where: { id: admin.id }, data: { mfaEnabled: true, mfaSecret: encryptTotpSecret(secret), mfaRecoveryCodes: [hashRecoveryCode('recoverycode1234')], lastMfaCounter: null } });
    const unverifiedToken = await generateToken(admin, { mfaVerified: false });
    const code = totp(secret);
    const outcomes = await Promise.all([
      request(app).post('/auth/admin-mfa/challenge').set('Authorization', `Bearer ${unverifiedToken}`).send({ code }),
      request(app).post('/auth/admin-mfa/challenge').set('Authorization', `Bearer ${unverifiedToken}`).send({ code }),
    ]);
    expect(outcomes.map((result) => result.status).sort()).toEqual([200, 400]);
    const replay = await request(app).post('/auth/admin-mfa/challenge').set('Authorization', `Bearer ${unverifiedToken}`).send({ code });
    expect(replay.status).toBe(400);
    const recovery = await request(app).post('/auth/admin-mfa/challenge').set('Authorization', `Bearer ${unverifiedToken}`).send({ code: 'recoverycode1234' });
    expect(recovery.status).toBe(200);
    const recoveryReplay = await request(app).post('/auth/admin-mfa/challenge').set('Authorization', `Bearer ${unverifiedToken}`).send({ code: 'recoverycode1234' });
    expect(recoveryReplay.status).toBe(400);
  });
});
