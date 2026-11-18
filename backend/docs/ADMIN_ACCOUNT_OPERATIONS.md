# Administrator account operations

## Local bootstrap

Apply database migrations, set `NODE_ENV=development`, and point `DATABASE_URL` at the intended local database. Then run:

```sh
npm run admin:bootstrap-owner -- --environment local --email admin@localhost.test
```

The command refuses production mode, an existing account, or an existing active owner. It prints a randomly generated password only after creating the account. The first login must replace this temporary password before any other authenticated API or admin page is available; then enroll an authenticator. The destructive seed script intentionally does not provision administrators.

For local-only convenience, set `ADMIN_MFA_LOCAL_BYPASS=true` in a local environment file. The bypass requires `NODE_ENV=development`, a loopback database host, and a runtime outside Cloud Run. Test mode uses the explicit flag for isolated local fixtures. Deployed staging and development services must enroll and verify TOTP; keep the setting false in shared and deployed environments.

If enrolling MFA locally, generate and retain a dedicated encryption key:

```sh
node -p "require('crypto').randomBytes(32).toString('base64')"
```

Set its output as `ADMIN_MFA_ENCRYPTION_KEY`. The application encrypts TOTP seeds with AES-GCM and stores only keyed digests of recovery codes.

## Initial production setup

An authorized operator must select the production project and database target, apply the reviewed migration, and run the command from a controlled operator environment with the production database URL explicitly selected:

Before deployment, provision a dedicated 32-byte random key as the `ADMIN_MFA_ENCRYPTION_KEY` Secret Manager secret and grant the backend runtime service account access. The deployment workflow injects this secret. Preserve it in the approved secret manager; changing it requires a planned re-encryption migration before the new key is activated.

```sh
NODE_ENV=production DATABASE_URL="$PRODUCTION_DATABASE_URL" ADMIN_BOOTSTRAP_TARGET_ID=parkpal-prod-primary npm run admin:bootstrap-owner -- --environment production --target-id parkpal-prod-primary --email owner@example.com --confirm-production
```

Review the command target and database identity before execution. Capture the one-time password directly into the approved secrets manager; do not paste it into tickets, chat, terminal transcripts, or logs. The owner must enroll TOTP immediately. Additional admins are provisioned only through the owner invitation screen. Production bootstrap is an operator procedure and is not run by deployments or database seeds.

## Lifecycle

Only an active, MFA-verified platform owner can invite or deactivate/reactivate administrators. Invitations expire after 48 hours, can be revoked, and are single-use. Deactivated admin rows remain available for audit history and cannot authenticate. Privileged account actions are stored in `admin_access_audit`; invitation secrets and passwords are never stored in audit records.
