---
name: deployment-status
description: Check live ParkPal deployment health using available authorized GCP evidence.
---

When the user asks for deployment status or a health check, inspect the current deployment configuration and then query the configured GCloud integration or `gcloud` CLI if available and authorized. The current backend workflow defines project `parkpal-474417`, region `asia-southeast1`, and environment-specific services `parkpal-backend-dev`, `parkpal-backend-staging`, and `parkpal-backend-prod`. Confirm the target environment from the request or live configuration before reporting a service as current.

Useful read-only checks (substitute the verified target):

```bash
gcloud run services describe SERVICE --project=parkpal-474417 --region=asia-southeast1 --format=json
gcloud run services logs read SERVICE --project=parkpal-474417 --region=asia-southeast1 --limit=20
gcloud sql instances describe parkpal-db --project=parkpal-474417 --format=json
```

Check only the components relevant to the request. Do not retrieve secret values. To check secret configuration, report metadata or presence only where authorized. If live GCP access is unavailable, distinguish repository configuration from actual deployment state and report the status as unverified.

Summarize the verified project, region, service, latest revision/readiness, relevant recent errors, and database state when checked. Include the evidence source and observation time when available. Do not infer health from a service existing or a historical example. Do not invent URLs, revisions, timestamps, logs, secret counts, budgets, or costs.

This is a read-only status workflow. A recommendation to redeploy, start a database, or change a service is not authorization to do so. Obtain explicit user approval before deployment or any cost-bearing service change.
