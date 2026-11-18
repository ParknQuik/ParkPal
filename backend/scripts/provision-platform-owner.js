require('dotenv').config();
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? undefined : process.argv[index + 1];
}

async function main() {
  const environment = argument('environment');
  const targetId = argument('target-id');
  const email = argument('email')?.trim().toLowerCase();
  if (!['local', 'production'].includes(environment) || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Usage: npm run admin:bootstrap-owner -- --environment local|production --email owner@example.com');
  }
  if (environment === 'production' && (process.env.NODE_ENV !== 'production' || process.argv.indexOf('--confirm-production') < 0 || !targetId || targetId !== process.env.ADMIN_BOOTSTRAP_TARGET_ID)) {
    throw new Error('Production bootstrap requires NODE_ENV=production, --confirm-production, and a --target-id matching ADMIN_BOOTSTRAP_TARGET_ID.');
  }
  if (environment === 'local' && process.env.NODE_ENV === 'production') throw new Error('Refusing local bootstrap against NODE_ENV=production.');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must target the operator-selected database.');
  if (environment === 'local') {
    const host = new URL(process.env.DATABASE_URL).hostname;
    if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) throw new Error('Local bootstrap only accepts a loopback database target.');
  }

  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(86420371)`;
      const existing = await tx.user.findUnique({ where: { email } });
      if (existing?.role === 'admin' && existing.isPlatformOwner && existing.isActive) return null;
      if (existing) throw new Error('That email already belongs to an account; refusing to change its privileges or password.');
      const owners = await tx.user.count({ where: { role: 'admin', isPlatformOwner: true, isActive: true } });
      if (owners > 0) throw new Error('An active platform owner already exists. Use owner-managed invitations for additional admins.');
      const password = `Pq-${crypto.randomBytes(24).toString('base64url')}!7a`;
      const hashed = await bcrypt.hash(password, 12);
      const owner = await tx.user.create({ data: { email, name: 'Platform Owner', password: hashed, role: 'admin', isPlatformOwner: true, mustChangePassword: true } });
      await tx.adminAccessAudit.create({ data: { targetId: owner.id, targetEmail: email, action: 'platform_owner_bootstrapped' } });
      return { owner, password };
    });
    if (!result) {
      console.log(`Active platform owner already provisioned for ${email}. No credential was generated.`);
      return;
    }
    console.log(`Platform owner created for ${email} on ${environment}${targetId ? ` target ${targetId}` : ''}. One-time password: ${result.password}`);
    console.log('Store this credential securely, sign in, and enroll an authenticator before using admin tools.');
  } finally { await prisma.$disconnect(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
