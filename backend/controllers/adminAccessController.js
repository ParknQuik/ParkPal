const crypto = require('crypto');
const prisma = require('../config/prisma');
const { hashPassword, validatePassword } = require('../services/auth');
const { sendAdminInvitationEmail } = require('../services/email');

const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
const safeUser = ({ id, name, email, isActive, isPlatformOwner, mfaEnabled, createdAt }) => ({ id, name, email, isActive, isPlatformOwner, mfaEnabled, createdAt });
const fail = (res, status, error) => res.status(status).json({ error });

exports.list = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({ where: { role: 'admin' }, orderBy: { createdAt: 'asc' } });
    const invitations = await prisma.adminInvitation.findMany({ where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, email: true, expiresAt: true, createdAt: true } });
    res.json({ admins: users.map(safeUser), invitations });
  } catch (error) { next(error); }
};

exports.invite = async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, 'A valid email is required');
    const secret = crypto.randomBytes(32).toString('base64url');
    const invitation = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(86420371)`;
      const [user, pending] = await Promise.all([
        tx.user.findUnique({ where: { email } }),
        tx.adminInvitation.findFirst({ where: { email, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }),
      ]);
      if (user) throw Object.assign(new Error('An account already exists for this email'), { statusCode: 409 });
      if (pending) throw Object.assign(new Error('An active invitation already exists for this email'), { statusCode: 409 });
      const created = await tx.adminInvitation.create({ data: { email, tokenHash: digest(secret), expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), issuerId: req.user.id } });
      await tx.adminAccessAudit.create({ data: { actorId: req.user.id, targetEmail: email, action: 'invitation_sent' } });
      return created;
    });
    try {
      await sendAdminInvitationEmail(email, secret);
    } catch {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(86420371)`;
        await tx.adminInvitation.updateMany({ where: { id: invitation.id, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.adminAccessAudit.create({ data: { actorId: req.user.id, targetEmail: email, action: 'invitation_delivery_failed' } });
      });
      return fail(res, 502, 'Invitation email could not be delivered. You can retry by sending a new invitation.');
    }
    res.status(201).json({ id: invitation.id, email, expiresAt: invitation.expiresAt });
  } catch (error) { if (error.statusCode === 409) return fail(res, 409, error.message); next(error); }
};

exports.revokeInvitation = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return fail(res, 400, 'Invitation id must be a positive integer');
    const invitation = await prisma.adminInvitation.findUnique({ where: { id } });
    if (!invitation || invitation.acceptedAt || invitation.revokedAt) return fail(res, 404, 'Invitation not found');
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(86420371)`;
      const current = await tx.adminInvitation.findUnique({ where: { id } });
      if (!current || current.acceptedAt || current.revokedAt) throw Object.assign(new Error('Invitation not found'), { statusCode: 404 });
      await tx.adminInvitation.update({ where: { id }, data: { revokedAt: new Date() } });
      await tx.adminAccessAudit.create({ data: { actorId: req.user.id, targetEmail: current.email, action: 'invitation_revoked' } });
    });
    res.json({ message: 'Invitation revoked' });
  } catch (error) { next(error); }
};

exports.setActive = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) return fail(res, 400, 'Admin id must be a positive integer');
    const active = req.body?.active;
    if (typeof active !== 'boolean') return fail(res, 400, 'active must be boolean');
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== 'admin') return fail(res, 404, 'Admin account not found');
    if (!active && target.isPlatformOwner) {
      const ownerCount = await prisma.user.count({ where: { role: 'admin', isPlatformOwner: true, isActive: true } });
      if (ownerCount <= 1) return fail(res, 409, 'The final active platform owner cannot be deactivated');
    }
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(86420371)`;
      const current = await tx.user.findUnique({ where: { id } });
      if (!current || current.role !== 'admin') throw Object.assign(new Error('Admin account not found'), { statusCode: 404 });
      if (!active && current?.isPlatformOwner && (await tx.user.count({ where: { role: 'admin', isPlatformOwner: true, isActive: true } })) <= 1) {
        throw Object.assign(new Error('The final active platform owner cannot be deactivated'), { statusCode: 409 });
      }
      const changed = await tx.user.update({ where: { id }, data: { isActive: active } });
      await tx.adminAccessAudit.create({ data: { actorId: req.user.id, targetId: id, action: active ? 'admin_reactivated' : 'admin_deactivated' } });
      return changed;
    });
    res.json({ admin: safeUser(updated) });
  } catch (error) { if (error.statusCode === 409) return fail(res, 409, error.message); next(error); }
};

exports.acceptInvitation = async (req, res, next) => {
  try {
    const token = req.body?.token;
    const name = String(req.body?.name || '').trim();
    const password = req.body?.password;
    if (typeof token !== 'string' || token.length < 20 || token.length > 200 || name.length < 2 || name.length > 100 || typeof password !== 'string') return fail(res, 400, 'Invitation, valid name, and password are required');
    const passwordCheck = await validatePassword(password);
    if (!passwordCheck.valid) return fail(res, 400, passwordCheck.error);
    const invitation = await prisma.adminInvitation.findUnique({ where: { tokenHash: digest(token) } });
    if (!invitation || invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt <= new Date()) return fail(res, 400, 'Invitation is invalid, expired, or already used');
    const hashed = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(86420371)`;
      const fresh = await tx.adminInvitation.findUnique({ where: { id: invitation.id } });
      if (!fresh || fresh.revokedAt || fresh.acceptedAt || fresh.expiresAt <= new Date()) throw Object.assign(new Error('Invitation is invalid, expired, or already used'), { statusCode: 400 });
      const created = await tx.user.create({ data: { name, email: fresh.email, password: hashed, role: 'admin' } });
      await tx.adminInvitation.update({ where: { id: fresh.id }, data: { acceptedAt: new Date() } });
      await tx.adminAccessAudit.create({ data: { targetId: created.id, targetEmail: created.email, action: 'invitation_accepted' } });
      return created;
    });
    res.status(201).json({ message: 'Admin account created. Sign in and enroll in MFA to access admin tools.', email: user.email });
  } catch (error) { if (error.statusCode) return fail(res, error.statusCode, error.message); next(error); }
};
