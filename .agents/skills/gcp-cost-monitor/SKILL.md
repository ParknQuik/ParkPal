---
name: gcp-cost-monitor
description: Review ParkPal GCP billing and resource usage from current authorized evidence.
---

When the user asks for GCP costs, prefer actual billing reports or billing export data for the requested project and time period. Use the configured GCloud integration or `gcloud` only when available and authorized. ParkPal's backend deployment workflow currently names project `parkpal-474417` and region `asia-southeast1`; verify the requested billing scope rather than assuming all ParkPal environments or projects are included.

Resource configuration can explain cost drivers but does not establish billed cost. If actual billing data is unavailable, clearly label any calculation as an estimate, state its assumptions and period, and avoid unsupported historical comparisons or budget claims. Separate observed billing totals from projections and resource-based estimates. Do not invent usage, utilization, savings, thresholds, or resource state.

Use read-only queries for service, database, and bucket configuration when needed. Do not list or reveal secret values. A recommendation to stop, resize, delete, or otherwise alter a resource is not authorization to make that change. Get explicit user approval before any cost-bearing service mutation or deployment.

Report the source, project, billing period, currency, actual billed amount when available, and what is excluded or estimated. Mark unavailable checks as not verified; do not report generic pricing examples as ParkPal's current bill.
