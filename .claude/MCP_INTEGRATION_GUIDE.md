# ParkPal MCP Integration Guide

**Last Updated:** March 10, 2026
**Purpose:** Leverage MCPs to accelerate development workflow

---

## 🎯 Installed MCPs

### 1. IDE MCP (`mcp__ide__*`)
**Purpose:** VS Code integration for diagnostics and code execution

**Available Tools:**
- `mcp__ide__getDiagnostics` - Get VS Code language diagnostics
- `mcp__ide__executeCode` - Execute Python code in Jupyter kernel

### 2. GCloud MCP (`mcp__gcloud__*`)
**Purpose:** Direct GCP CLI access without bash overhead

**Available Tools:**
- `mcp__gcloud__run_gcloud_command` - Execute gcloud commands directly

---

## 📋 MCP Use Cases for ParkPal

### Use Case 1: Real-time TypeScript/JavaScript Error Detection

**Before (Manual):**
```bash
# Run ESLint manually
npm run lint

# Check TypeScript errors
npx tsc --noEmit
```

**With IDE MCP:**
```javascript
// Get diagnostics for specific file
mcp__ide__getDiagnostics({ uri: "file:///path/to/backend/services/email.js" })

// Get all project diagnostics
mcp__ide__getDiagnostics()
```

**When to Use:**
- ✅ Before committing code
- ✅ After making changes to critical files
- ✅ When debugging type errors
- ✅ During code reviews

**Workflow Integration:**
```markdown
1. Edit backend/services/email.js
2. Call mcp__ide__getDiagnostics to check errors
3. Fix errors if any
4. Commit changes
```

---

### Use Case 2: GCP Deployment & Monitoring (Optimized)

**Before (Bash overhead):**
```bash
# Multiple bash calls with overhead
gcloud run services list --project=parkpal-474417
gcloud logging read "..." --project parkpal-474417
gcloud secrets list --project=parkpal-474417
```

**With GCloud MCP (Faster):**
```javascript
// Direct gcloud execution (no bash overhead)
mcp__gcloud__run_gcloud_command({
  args: ["run", "services", "list", "--project=parkpal-474417", "--format=json"]
})

mcp__gcloud__run_gcloud_command({
  args: ["logging", "read", "resource.type=cloud_run_revision", "--limit=50", "--project=parkpal-474417"]
})

mcp__gcloud__run_gcloud_command({
  args: ["secrets", "list", "--project=parkpal-474417", "--format=json"]
})
```

**When to Use:**
- ✅ Checking deployment status
- ✅ Reading Cloud Run logs
- ✅ Managing secrets
- ✅ Monitoring resource usage
- ✅ Checking database status
- ✅ Verifying IAM permissions

**Workflow Integration:**
```markdown
DEPLOYMENT CHECK WORKFLOW:
1. mcp__gcloud__run_gcloud_command: Check Cloud Run status
2. mcp__gcloud__run_gcloud_command: Get latest logs
3. mcp__gcloud__run_gcloud_command: Verify database connection
4. mcp__gcloud__run_gcloud_command: Check secrets configuration
5. Report status to user
```

---

### Use Case 3: Python Code Execution (Future - Data Analytics)

**Purpose:** Execute Python scripts for Service 1 analytics when implemented

**With IDE MCP:**
```python
# Execute Python code directly
mcp__ide__executeCode({
  code: `
import pandas as pd
import numpy as np

# Load parking session data
sessions = pd.read_csv('parking_sessions.csv')

# Calculate average circling time by zone
avg_circling = sessions.groupby('zone_id')['circling_duration_seconds'].mean()
print(avg_circling)
`
})
```

**When to Use:**
- ✅ Phase 6+ (Service 1 Analytics implementation)
- ✅ Testing Databricks queries locally
- ✅ Prototyping ML models
- ✅ Data validation scripts
- ✅ Quick calculations/analysis

**Workflow Integration:**
```markdown
SERVICE 1 ANALYTICS WORKFLOW (FUTURE):
1. Query parking session data from PostgreSQL
2. mcp__ide__executeCode: Run Pandas analysis
3. mcp__ide__executeCode: Generate charts/insights
4. Save results to database
5. Update analytics dashboard
```

---

## 🚀 Recommended Workflows

### Workflow 1: Pre-Commit Quality Check

**Goal:** Ensure code quality before committing

**Steps:**
```markdown
1. Make code changes
2. mcp__ide__getDiagnostics() - Check for errors
3. Fix any TypeScript/JavaScript errors
4. Run tests: npm test
5. Commit if all pass
```

**Automation Opportunity:**
```javascript
// Custom skill: .claude/skills/pre-commit-check/SKILL.md
"Before committing, always:
1. Call mcp__ide__getDiagnostics to check errors
2. Report any errors found
3. Only proceed to commit if diagnostics are clean"
```

---

### Workflow 2: Deployment Health Check

**Goal:** Verify deployment after push to dev/qa/main

**Steps:**
```markdown
1. Push code to branch
2. Wait 3 minutes (GitHub Actions deployment time)
3. mcp__gcloud__run_gcloud_command: Check Cloud Run status
4. mcp__gcloud__run_gcloud_command: Read deployment logs
5. mcp__gcloud__run_gcloud_command: Verify health endpoint
6. Report success/failure to user
```

**Automation Opportunity:**
```javascript
// Custom skill: .claude/skills/deployment-health-check/SKILL.md
"After deployment:
1. Use mcp__gcloud__run_gcloud_command to check service status
2. Use mcp__gcloud__run_gcloud_command to read logs for errors
3. Report deployment health with specific issues if any"
```

---

### Workflow 3: Bug Investigation

**Goal:** Quickly investigate production bugs

**Steps:**
```markdown
1. User reports bug
2. mcp__ide__getDiagnostics: Check for code errors
3. mcp__gcloud__run_gcloud_command: Read Cloud Run logs with filter
4. mcp__gcloud__run_gcloud_command: Check database connection
5. mcp__gcloud__run_gcloud_command: Verify secrets loaded
6. Identify root cause
7. Fix and redeploy
```

---

### Workflow 4: Secret Management

**Goal:** Safely manage secrets in GCP Secret Manager

**Steps:**
```markdown
1. mcp__gcloud__run_gcloud_command: List current secrets
2. mcp__gcloud__run_gcloud_command: Create new secret (if needed)
3. mcp__gcloud__run_gcloud_command: Update secret version
4. mcp__gcloud__run_gcloud_command: Grant service account access
5. Trigger redeployment to pick up new secret
```

**Example:**
```javascript
// List all secrets
mcp__gcloud__run_gcloud_command({
  args: ["secrets", "list", "--project=parkpal-474417", "--format=json"]
})

// Create new secret (SMTP_HOST example)
mcp__gcloud__run_gcloud_command({
  args: ["secrets", "create", "SMTP_HOST", "--data-file=-", "--project=parkpal-474417"]
})

// Grant access to service account
mcp__gcloud__run_gcloud_command({
  args: [
    "secrets", "add-iam-policy-binding", "SMTP_HOST",
    "--member=serviceAccount:parkpal-backend-service@parkpal-474417.iam.gserviceaccount.com",
    "--role=roles/secretmanager.secretAccessor",
    "--project=parkpal-474417"
  ]
})
```

---

## 🛠️ Creating Custom Skills with MCPs

### Skill 1: Backend Diagnostics Check

**File:** `.claude/skills/backend-diagnostics/SKILL.md`

```markdown
---
name: backend-diagnostics
description: Check backend code for errors before committing
---

When the user says "check backend" or "diagnose backend":

1. Call mcp__ide__getDiagnostics with backend files
2. Parse errors and warnings
3. Group by severity (error, warning, info)
4. Report findings with file paths and line numbers
5. Suggest fixes for common issues

Example output:
"Backend diagnostics: 2 errors, 5 warnings found.

Errors:
- backend/services/email.js:45 - Cannot find module 'nodemailer'
- backend/routes/auth.js:123 - 'user' is possibly undefined

Warnings:
- backend/utils/validation.js:67 - Unused variable 'result'
..."
```

---

### Skill 2: Deployment Status Reporter

**File:** `.claude/skills/deployment-status/SKILL.md`

```markdown
---
name: deployment-status
description: Quick deployment health check using GCloud MCP
---

When the user says "check deployment" or "deployment status":

1. Use mcp__gcloud__run_gcloud_command to get Cloud Run services
2. Use mcp__gcloud__run_gcloud_command to check latest logs
3. Use mcp__gcloud__run_gcloud_command to verify database state
4. Use mcp__gcloud__run_gcloud_command to list secrets
5. Generate health report

Report format:
"📊 Deployment Status (parkpal-474417)

✅ Backend: RUNNING
   - Service: parkpal-backend-dev
   - URL: https://parkpal-backend-dev-*.run.app
   - Latest revision: healthy
   - Last deployment: 10 minutes ago

🗄️ Database: UP
   - Instance: parkpal-db
   - Status: RUNNABLE
   - Connection: OK

🔐 Secrets: 10/10 configured
   - DATABASE_URL ✅
   - JWT_SECRET ✅
   - SMTP_HOST ✅
   ...

📝 Recent Logs: No errors in last 50 entries"
```

---

### Skill 3: GCP Cost Monitor

**File:** `.claude/skills/gcp-cost-monitor/SKILL.md`

```markdown
---
name: gcp-cost-monitor
description: Monitor GCP costs and resource usage
---

When the user says "check costs" or "gcp costs":

1. Use mcp__gcloud__run_gcloud_command to list Cloud Run services with stats
2. Use mcp__gcloud__run_gcloud_command to get Cloud SQL instance tier
3. Use mcp__gcloud__run_gcloud_command to list storage buckets with size
4. Calculate estimated monthly costs
5. Compare against budget alerts

Report format:
"💰 GCP Cost Estimate (parkpal-474417)

Cloud Run: $5-10/month
- parkpal-backend-dev: 0-10 instances, 512Mi, 1 CPU

Cloud SQL: $0/month (STOPPED)
- parkpal-db: db-custom-1-3840 (stopped for cost savings)

Cloud Storage: $2/month
- parkpal-prod-photos: 0.5 GB
- parkpal-prod-backups: 0.1 GB

Total: $7-12/month
Budget Alert: $50/month (14-24% used) ✅"
```

---

## 📚 Best Practices

### 1. Prefer MCP over Bash for GCP Commands
```javascript
// ❌ AVOID (Bash overhead)
Bash({ command: "gcloud run services list --project=parkpal-474417" })

// ✅ PREFER (Direct MCP call)
mcp__gcloud__run_gcloud_command({ args: ["run", "services", "list", "--project=parkpal-474417"] })
```

### 2. Batch MCP Calls When Possible
```javascript
// ✅ Make multiple MCP calls in parallel
Promise.all([
  mcp__gcloud__run_gcloud_command({ args: ["run", "services", "list", ...] }),
  mcp__gcloud__run_gcloud_command({ args: ["sql", "instances", "list", ...] }),
  mcp__gcloud__run_gcloud_command({ args: ["secrets", "list", ...] })
])
```

### 3. Use Diagnostics Before Committing
```javascript
// ✅ Always check before git commit
mcp__ide__getDiagnostics() // Check entire project
mcp__ide__getDiagnostics({ uri: "file:///.../modified-file.js" }) // Check specific file
```

### 4. Use JSON Format for Structured Data
```javascript
// ✅ Request JSON format for parsing
mcp__gcloud__run_gcloud_command({
  args: ["run", "services", "list", "--project=parkpal-474417", "--format=json"]
})
```

---

## 🎯 Next Steps

### Immediate (This Week)
1. ✅ Document all installed MCPs
2. ⏳ Create "backend-diagnostics" skill
3. ⏳ Create "deployment-status" skill
4. ⏳ Test MCP workflows in practice

### Short-Term (Next 2 Weeks)
5. Create "gcp-cost-monitor" skill
6. Create "secret-manager" skill
7. Integrate MCPs into pre-commit hooks
8. Add MCP usage to STATUS_REPORT.md updates

### Long-Term (Phase 6+)
9. Create analytics skills using Python execution MCP
10. Build data pipeline monitoring with MCPs
11. Automate performance testing with MCP + Python

---

## 📖 References

- **MCP Documentation:** Available in Claude Code docs
- **GCloud CLI Reference:** https://cloud.google.com/sdk/gcloud/reference
- **VS Code Diagnostics API:** Built into IDE MCP
- **Project Status:** `STATUS_REPORT.md`
- **Deployment Guide:** `docs/DEPLOYMENT.md`

---

**Status:** ✅ MCPs installed and documented
**Next Action:** Create custom skills to leverage MCPs in daily workflow
