const { spawnSync } = require('child_process');
const express = require('express');
const request = require('supertest');
const { cleanDatabase, prisma } = require('./setup');
const authController = require('../controllers/authController');
const { authenticate } = require('../services/auth');

const app = express();
app.use(express.json());
app.post('/login', authController.login);
app.get('/session-check', authenticate, (req, res) => res.json(req.user));
app.put('/auth/password', authenticate, (req, _res, next) => { req.validatedData = req.body; next(); }, authController.changePassword);

function provision(environment, extra = []) {
  return spawnSync(process.execPath, [
    'scripts/provision-platform-owner.js', '--environment', environment,
    '--email', 'admin@localhost.test', ...extra,
  ], { cwd: process.cwd(), encoding: 'utf8', env: process.env });
}

describe('platform owner bootstrap command', () => {
  const originalBypass = process.env.ADMIN_MFA_LOCAL_BYPASS;
  beforeAll(async () => cleanDatabase());
  afterAll(async () => {
    await cleanDatabase(); await prisma.$disconnect();
    if (originalBypass === undefined) delete process.env.ADMIN_MFA_LOCAL_BYPASS;
    else process.env.ADMIN_MFA_LOCAL_BYPASS = originalBypass;
  });

  it('refuses unexpected environments, creates once, returns credentials, and supports local login', async () => {
    const badEnvironment = provision('production');
    expect(badEnvironment.status).not.toBe(0);
    expect(badEnvironment.stdout + badEnvironment.stderr).not.toMatch(/One-time password:/);

    const create = spawnSync(process.execPath, ['scripts/provision-platform-owner.js', '--environment', 'local', '--email', 'admin@localhost.test'], {
      cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, NODE_ENV: 'development' },
    });
    expect(create.status).toBe(0);
    const credential = create.stdout.match(/One-time password: (\S+)/)?.[1];
    expect(credential).toMatch(/^Pq-.+!7a$/);

    const repeat = spawnSync(process.execPath, ['scripts/provision-platform-owner.js', '--environment', 'local', '--email', 'admin@localhost.test'], {
      cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, NODE_ENV: 'development' },
    });
    expect(repeat.status).toBe(0);
    expect(repeat.stdout).toContain('already provisioned');
    expect(repeat.stdout).not.toMatch(/One-time password:/);

    process.env.ADMIN_MFA_LOCAL_BYPASS = 'false';
    const login = await request(app).post('/login').send({ email: 'admin@localhost.test', password: credential });
    expect(login.status).toBe(200);
    expect(login.body.mfaEnrollmentRequired).toBe(true);
    expect(login.body.mustChangePassword).toBe(true);
    const token = login.body.token;
    const blocked = await request(app).get('/session-check').set('Authorization', `Bearer ${token}`);
    expect(blocked.status).toBe(403);
    const changed = await request(app).put('/auth/password').set('Authorization', `Bearer ${token}`).send({ oldPassword: credential, newPassword: 'ChangedPass456!' });
    expect(changed.status).toBe(200);
    const allowed = await request(app).get('/session-check').set('Authorization', `Bearer ${token}`);
    expect(allowed.status).toBe(200);
    const oldPasswordLogin = await request(app).post('/login').send({ email: 'admin@localhost.test', password: credential });
    expect(oldPasswordLogin.status).toBe(401);
    const newPasswordLogin = await request(app).post('/login').send({ email: 'admin@localhost.test', password: 'ChangedPass456!' });
    expect(newPasswordLogin.status).toBe(200);
    expect(newPasswordLogin.body.mustChangePassword).toBe(false);
  });
});
