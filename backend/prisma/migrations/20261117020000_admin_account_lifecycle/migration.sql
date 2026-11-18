ALTER TABLE "users"
  ADD COLUMN "is_platform_owner" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mfa_secret" TEXT,
  ADD COLUMN "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mfa_recovery_codes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "admin_invitations" (
  "id" SERIAL NOT NULL,
  "email" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "accepted_at" TIMESTAMP(3),
  "issuer_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_invitations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_invitations_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "admin_invitations_token_hash_key" ON "admin_invitations"("token_hash");
CREATE INDEX "admin_invitations_email_accepted_at_revoked_at_idx" ON "admin_invitations"("email", "accepted_at", "revoked_at");

CREATE TABLE "admin_access_audit" (
  "id" SERIAL NOT NULL,
  "actor_id" INTEGER,
  "target_id" INTEGER,
  "action" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_access_audit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_access_audit_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "admin_access_audit_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "admin_access_audit_created_at_idx" ON "admin_access_audit"("created_at");
CREATE INDEX "admin_access_audit_target_id_created_at_idx" ON "admin_access_audit"("target_id", "created_at");
