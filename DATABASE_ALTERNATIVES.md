# Database Alternatives for Development/Testing

## Problem
- Cloud SQL is too expensive ($80+/month for always-on)
- Need to test the app but can't afford to keep Cloud SQL running 24/7

## Alternative Options (Cheapest to Most Capable)

### Option 1: SQLite (FREE - Recommended for local dev)
- Uses Prisma with SQLite provider (just change provider in schema)
- Zero cost, runs locally
- Perfect for: Development, unit tests
- Limitations: Single user, no concurrent writes
- How to switch:
  1. Change schema.prisma: provider = "sqlite" + url = "file:./dev.db"
  2. Run `npx prisma db push` 
  3. All existing code works the same

### Option 2: Neon Serverless PostgreSQL (FREE tier)
- Serverless PostgreSQL
- Free: 0.5GB storage, suspends when idle
- Cost: $0/month for light usage
- Perfect for: Development, some production
- How: Create account at neon.tech, get connection string

### Option 3: Supabase (FREE tier)
- PostgreSQL + extra features
- Free: 500MB DB, 2GB bandwidth
- Cost: $0/month for small apps
- Perfect: Production for small apps

### Option 4: Railway (FREE tier)
- PostgreSQL
- Free: $5 credit/month (enough for small dev)
- Cost: ~$2-3/month for always-on

### Option 5: Fly.io (FREE tier)
- PostgreSQL
- Free: 3 VMs, 3GB volume
- Cost: $0/month for dev

## Recommendation for ParkPal

For development/testing: Use SQLite locally
- Change Prisma to use SQLite
- Keep Cloud SQL for occasional production testing
- Total cost: $0

For staging: Neon (free tier) or Railway ($2-3/month)

For production: Keep Cloud SQL (or migrate to Neon when ready)

---

## Step-by-Step: Switch to SQLite for Local Development

### 1. Update `prisma/schema.prisma`

Change the provider from `postgresql` to `sqlite`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2. Create the local database

```bash
npx prisma db push
```

This creates `dev.db` in your project root.

### 3. Update environment variables (optional)

If you want to explicitly set the SQLite path:

```env
DATABASE_URL="file:./dev.db"
```

Or just rely on the schema.prisma URL.

### 4. Verify it works

```bash
npm run dev
```

All your existing queries and Prisma operations work identically - SQLite speaks the same SQL subset that PostgreSQL does for most operations.

### 5. Switching back to PostgreSQL/Cloud SQL

When ready to test against Cloud SQL:

1. Revert schema.prisma to use `postgresql` provider
2. Set `DATABASE_URL` to your Cloud SQL connection string
3. Run `npx prisma db push` to sync schema

---

## Quick Reference: Cost Comparison

| Option | Cost | Best For |
|--------|------|----------|
| SQLite | $0 | Local dev, tests |
| Neon | $0 | Dev, staging |
| Supabase | $0 | Small production |
| Railway | ~$2-3/mo | Staging |
| Fly.io | $0 | Dev |
| Cloud SQL | $80+/mo | Production |
