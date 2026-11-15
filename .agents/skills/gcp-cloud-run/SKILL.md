---
name: gcp-cloud-run
description: Build and maintain Cloud Run services and event-driven workloads with deployment guidance grounded in ParkPal's current configuration.
source: vibeship-spawner-skills (Apache 2.0)
---

# GCP Cloud Run

Use this for Cloud Run implementation and operational questions. For ParkPal, inspect `.github/workflows/deploy-backend.yml` and the relevant deployment docs before changing service configuration. The current backend workflow uses project `parkpal-474417`, region `asia-southeast1`, image `gcr.io/parkpal-474417/parkpal-backend:<commit-sha>`, and environment-specific service names `parkpal-backend-dev`, `parkpal-backend-staging`, and `parkpal-backend-prod`. It also configures Cloud SQL, Secret Manager references, service identity, per-environment instance bounds, memory, CPU, timeout, and concurrency. Treat the workflow as current configuration evidence and recheck it when needed.

## Service design

- Listen on `process.env.PORT` and bind to `0.0.0.0`; handle termination gracefully and keep request handlers stateless where practical.
- Set health checks, request timeout, concurrency, CPU, memory, and instance bounds from measured workload and dependency limits.
- Use a least-privilege service account and Secret Manager references. Never place secret values in source, logs, command history, or generated examples.
- Account for Cloud SQL connection limits, startup and shutdown, request retries, and idempotency. Do not assume background CPU is available when no request is being served.
- Use Cloud Run Jobs or event-driven services for work that does not fit a request lifecycle; choose Pub/Sub or storage triggers only when the product needs them.

## Illustrative examples

The following examples explain Cloud Run mechanics; they are not a prescription for ParkPal's live configuration. Verify project, region, service, image, environment, permissions, and cost impact before adapting them.

```js
const port = Number(process.env.PORT || 8080);
const server = app.listen(port, '0.0.0.0');

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
```

Read-only inspection of the configured ParkPal backend service:

```bash
gcloud run services describe parkpal-backend-dev \
  --project=parkpal-474417 \
  --region=asia-southeast1 \
  --format=json
```

Deployment commands and service updates can change production behavior or incur cost. Before running them, summarize the exact target and changes and obtain explicit user approval. The repository's GitHub Actions deployment workflow is the normal deployment path; do not bypass it without a user-directed reason and approval.

When suggesting min instances, CPU boost, memory increases, or always-allocated CPU, explain the likely cost and reliability trade-off using current verified pricing or mark the estimate as uncertain. Never present generic pricing snippets or sample configurations as current ParkPal facts.
