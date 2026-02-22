# ParkPal Staging Environment Credentials

**Date:** February 22, 2026
**Environment:** Staging Only (Production Paused)

---

## 🔐 Save These Credentials Securely!

### GCP Projects

| Project | Project ID | Purpose | Status |
|---------|-----------|---------|--------|
| Development | `parkpal-474417` | Local development & testing | ✅ Active |
| Staging | `parkpal-staging` | Staging deployment | ✅ Active |
| Production | `parkpal-production` | Production deployment | ⏸️ Paused (no resources created yet) |

---

## Staging Environment (`parkpal-staging`)

### Cloud SQL Database
- **Instance Name:** `parkpal-db-staging`
- **Database Version:** PostgreSQL 16
- **Tier:** `db-perf-optimized-N-2` (2 vCPU, 16GB RAM)
- **Region:** `asia-southeast1`
- **Connection Name:** `parkpal-staging:asia-southeast1:parkpal-db-staging`
- **Database Name:** `parknquik_staging`
- **Root Password:** `tiHKGFT4KptlbGVy15VE5seXMUOvjJQroq6SasUTKxk=`
- **Public IP:** `34.142.151.251`

### Service Account
- **Name:** `parkpal-backend-staging`
- **Email:** `parkpal-backend-staging@parkpal-staging.iam.gserviceaccount.com`
- **Roles:**
  - `roles/cloudsql.client`
  - `roles/storage.admin`
  - `roles/secretmanager.secretAccessor`
  - `roles/logging.logWriter`

### GCS Buckets
- **Photos:** `gs://parkpal-staging-photos` (STANDARD storage, CORS enabled)
- **Documents:** `gs://parkpal-staging-documents` (STANDARD storage)
- **Backups:** `gs://parkpal-staging-backups` (NEARLINE storage)

### Secrets (in GCP Secret Manager)
- ✅ `JWT_SECRET`: `d6f28dd1ffef101650c7aaf7f22a8ec0fa412a3f26a1c10e926269b205e2154836243738b045162a8c1db717b94b4187dfe2c76299c8de9cb47926daa57f5beb`
- ✅ `DATABASE_URL`: `postgresql://postgres:tiHKGFT4KptlbGVy15VE5seXMUOvjJQroq6SasUTKxk=@/parknquik_staging?host=/cloudsql/parkpal-staging:asia-southeast1:parkpal-db-staging`
- ⏳ `REDIS_URL`: (needs to be created - use Redis Cloud or existing from parkpal-474417)
- ⏳ `PAYMONGO_SECRET_KEY`: (need your key)
- ⏳ `PAYMONGO_PUBLIC_KEY`: (need your key)
- ⏳ `GOOGLE_MAPS_API_KEY`: (need your key)

---

## Development Environment (`parkpal-474417`)

**Existing Resources:**
- Cloud SQL Instance: `parkpal-db` (RUNNING)
- Databases: `parknquik_staging`, `parknquik_production`
- Redis Cloud: `redis-19930.crce272.asia-seast1-1.gcp.cloud.redislabs.com:19930`
- GCS Buckets: `parkpal-prod-photos`, `parkpal-prod-documents`, `parkpal-prod-backups`
- Service Account: `parkpal-backend-service@parkpal-474417.iam.gserviceaccount.com`

---

## Next Steps

### To Complete Staging Setup:

1. **Add Redis** (choose one):
   - Option A: Create new Redis Cloud instance for staging
   - Option B: Reuse existing Redis from parkpal-474417 (cheaper)

2. **Add Remaining Secrets:**
   ```bash
   # REDIS_URL
   echo -n "YOUR_REDIS_URL" | gcloud secrets create REDIS_URL --data-file=- --project=parkpal-staging

   # PayMongo Keys
   echo -n "YOUR_PAYMONGO_SECRET_KEY" | gcloud secrets create PAYMONGO_SECRET_KEY --data-file=- --project=parkpal-staging
   echo -n "YOUR_PAYMONGO_PUBLIC_KEY" | gcloud secrets create PAYMONGO_PUBLIC_KEY --data-file=- --project=parkpal-staging

   # Google Maps API Key
   echo -n "YOUR_GOOGLE_MAPS_API_KEY" | gcloud secrets create GOOGLE_MAPS_API_KEY --data-file=- --project=parkpal-staging
   ```

3. **Download Service Account Key** (for local testing):
   ```bash
   mkdir -p ~/.gcp
   gcloud iam service-accounts keys create ~/.gcp/parkpal-staging-sa-key.json \
     --iam-account=parkpal-backend-staging@parkpal-staging.iam.gserviceaccount.com \
     --project=parkpal-staging
   chmod 600 ~/.gcp/parkpal-staging-sa-key.json
   ```

4. **Grant Secret Access to Service Account:**
   ```bash
   for SECRET in JWT_SECRET DATABASE_URL REDIS_URL PAYMONGO_SECRET_KEY PAYMONGO_PUBLIC_KEY GOOGLE_MAPS_API_KEY
   do
     gcloud secrets add-iam-policy-binding $SECRET \
       --member="serviceAccount:parkpal-backend-staging@parkpal-staging.iam.gserviceaccount.com" \
       --role="roles/secretmanager.secretAccessor" \
       --project=parkpal-staging
   done
   ```

5. **Test Connection:**
   ```bash
   # Install Cloud SQL Proxy
   brew install cloud-sql-proxy

   # Start proxy
   cloud-sql-proxy parkpal-staging:asia-southeast1:parkpal-db-staging &

   # Test connection
   psql "host=127.0.0.1 port=5432 dbname=parknquik_staging user=postgres password=tiHKGFT4KptlbGVy15VE5seXMUOvjJQroq6SasUTKxk="
   ```

---

## Estimated Monthly Costs

### Staging Environment
- Cloud SQL (db-perf-optimized-N-2): ~$180/month
- GCS Buckets (minimal usage): ~$2/month
- Secret Manager: Free tier
- **Total: ~$182/month**

### Development Environment (parkpal-474417)
- Cloud SQL (existing): ~$80/month
- Redis Cloud: $5/month
- GCS Buckets: ~$2/month
- **Total: ~$87/month**

### Combined Monthly Cost
- **Staging + Development: ~$269/month**
- **Production: $0/month (paused)**

---

## Security Notes

1. ⚠️ **NEVER commit these credentials to git**
2. ⚠️ **Store passwords in a password manager** (1Password, LastPass, etc.)
3. ✅ All secrets are stored in GCP Secret Manager (encrypted at rest)
4. ✅ Service accounts use least-privilege IAM roles
5. ✅ Database passwords are 256-bit random
6. ✅ JWT secret is 512-bit random

---

## Quick Reference Commands

```bash
# List all secrets in staging
gcloud secrets list --project=parkpal-staging

# Access a secret value
gcloud secrets versions access latest --secret="JWT_SECRET" --project=parkpal-staging

# List GCS buckets
gsutil ls -p parkpal-staging

# Describe Cloud SQL instance
gcloud sql instances describe parkpal-db-staging --project=parkpal-staging

# List service accounts
gcloud iam service-accounts list --project=parkpal-staging
```

---

**Status:** ✅ Staging infrastructure ready (needs Redis + API keys to complete)
**Next Review:** After first deployment test
