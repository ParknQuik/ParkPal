---
name: deployment-status
description: Quick deployment health check for ParkPal infrastructure using GCloud MCP
---

When the user says "check deployment", "deployment status", "health check", or "is it deployed":

## Action Steps

1. Use `mcp__gcloud__run_gcloud_command` to check Cloud Run services
2. Use `mcp__gcloud__run_gcloud_command` to get latest Cloud Run logs
3. Use `mcp__gcloud__run_gcloud_command` to check Cloud SQL status
4. Use `mcp__gcloud__run_gcloud_command` to verify secrets configuration
5. Compile comprehensive health report

## GCloud MCP Commands

### 1. Check Cloud Run Services
```javascript
mcp__gcloud__run_gcloud_command({
  args: ["run", "services", "list", "--project=parkpal-474417", "--format=json"]
})
```

### 2. Get Latest Logs
```javascript
mcp__gcloud__run_gcloud_command({
  args: [
    "logging", "read",
    "resource.type=cloud_run_revision AND resource.labels.service_name=parkpal-backend-dev",
    "--limit=20",
    "--project=parkpal-474417",
    "--format=json"
  ]
})
```

### 3. Check Cloud SQL Status
```javascript
mcp__gcloud__run_gcloud_command({
  args: ["sql", "instances", "describe", "parkpal-db", "--project=parkpal-474417", "--format=json"]
})
```

### 4. List Secrets
```javascript
mcp__gcloud__run_gcloud_command({
  args: ["secrets", "list", "--project=parkpal-474417", "--format=json"]
})
```

## Output Format

```
📊 ParkPal Deployment Status (parkpal-474417)

🌐 BACKEND SERVICE
✅ Service: parkpal-backend-dev
   URL: https://parkpal-backend-dev-cxntrkjjmq-as.a.run.app
   Status: RUNNING
   Latest Revision: parkpal-backend-dev-00012-sxp
   Deployed: 10 minutes ago
   Health: ✅ Healthy

🗄️ DATABASE
✅ Instance: parkpal-db
   Status: RUNNABLE (or STOPPED)
   Version: PostgreSQL 16
   Tier: db-custom-1-3840
   Region: asia-southeast1
   Connection: parkpal-474417:asia-southeast1:parkpal-db

🔐 SECRETS (10 configured)
✅ DATABASE_URL
✅ JWT_SECRET
✅ REDIS_URL
✅ PAYMONGO_SECRET_KEY
✅ PAYMONGO_PUBLIC_KEY
✅ GOOGLE_MAPS_API_KEY
✅ SMTP_HOST
✅ SMTP_PORT
✅ SMTP_USER
✅ SMTP_PASS

📝 RECENT LOGS (Last 20 entries)
✅ No errors in recent logs
   Last log: "Server listening on port 8080"
   Timestamp: 2 minutes ago

💰 ESTIMATED COSTS
Cloud Run: $5-10/month
Cloud SQL: $0/month (stopped for cost savings)
Storage: $2/month
Total: $7-12/month ✅ (within $50 budget)

🎯 OVERALL HEALTH: ✅ OPERATIONAL
```

## Smart Behaviors

### If Backend is DOWN:
```
❌ BACKEND SERVICE: DOWN
   Issue: Service not responding
   Last Error: [error message from logs]
   Action: Check GitHub Actions workflow or redeploy
```

### If Database is STOPPED:
```
🟡 DATABASE: STOPPED
   Note: Stopped for cost optimization
   Action: Start with: gcloud sql instances patch parkpal-db --activation-policy=ALWAYS
```

### If Errors in Logs:
```
⚠️  RECENT LOGS: 3 errors found
   Error 1: "Cannot connect to database" (5 min ago)
   Error 2: "Secret Manager access denied" (8 min ago)
   Action: Check IAM permissions and database connection
```

### If Deployment is Recent:
```
🚀 RECENT DEPLOYMENT DETECTED
   Deployed: 2 minutes ago
   Commit: "fix: Update email service" (SHA: abc1234)
   Status: Still warming up, check again in 3 minutes
```

## Status Indicators

- ✅ **Healthy**: Service running, no errors
- 🟡 **Degraded**: Service running but with warnings
- ❌ **Down**: Service not responding or critical errors
- 🚀 **Deploying**: Recent deployment, still warming up
- 🔄 **Restarting**: Service restarting

## Integration Points

- **Post-deployment check:** Run after GitHub Actions completes
- **Morning standup:** Quick health check before work
- **Bug investigation:** First step when user reports issues
- **Cost monitoring:** Verify services aren't over-provisioned

## Performance

- Execution time: ~5-8 seconds (4 parallel MCP calls)
- Provides real-time status from GCP
- No local file access needed
- Comprehensive view in single command

## Example Usage

**User:** "check deployment"
**Assistant:**
1. Calls 4 mcp__gcloud__run_gcloud_command in parallel
2. Parses JSON responses
3. Generates formatted health report
4. Highlights any issues requiring attention

**User:** "is the backend running?"
**Assistant:**
1. Quick check using mcp__gcloud__run_gcloud_command
2. Reports: "✅ Yes, parkpal-backend-dev is RUNNING and healthy"
