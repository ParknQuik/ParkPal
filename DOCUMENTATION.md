# Documentation Guide

**Last Updated:** May 23, 2026

---

## File Map

### Always Read First
| File | Purpose |
|------|---------|
| `.agents/knowledge/README.md` | Repo-local knowledge index usage and rules |
| `.agents/knowledge/sources.json` | Configured markdown sources for agent retrieval |
| `STATUS_REPORT.md` | Current production readiness, blockers, deployment status |
| `ROADMAP.md` | Development roadmap and sprint planning |
| `TECH_STACK_SUMMARY.md` | Authoritative tech stack reference |
| `docs/BETA_READINESS_CHECKLIST.md` | Beta gate checklist and latest validation evidence |

### Architecture & Infrastructure
| File | Purpose |
|------|---------|
| `docs/PARKPAL_SYSTEM_ARCHITECTURE.md` | Two-service architecture, data models, API design |
| `docs/DEPLOYMENT.md` | GCP Cloud Run deployment guide |
| `docs/ENVIRONMENTS.md` | Environment variables reference |
| `docs/GCP_SECRET_MANAGER.md` | Secret Manager setup and usage |
| `docs/GOOGLE_MAPS_SETUP.md` | Google Maps API key setup (mobile + web) |
| `docs/PAYMONGO.md` | PayMongo payment integration guide |
| `database/redis.md` | Redis configuration |

### Backend
| File | Purpose |
|------|---------|
| `backend/AUTO_CHECKOUT.md` | Auto-checkout service (cron, pricing, testing) |
| `backend/API_VERSIONING_GUIDE.md` | API versioning strategy |
| `backend/PRISMA_STUDIO_GUIDE.md` | Database management with Prisma Studio |
| `backend/PASSWORD_RESET_IMPLEMENTATION.md` | Forgot password flow |
| `backend/ANALYTICS_TEST_STATUS.md` | Analytics endpoint test coverage |
| `backend/tests/EMAIL_TESTING_GUIDE.md` | Email (Resend API) testing |
| `backend/docs/PHOTO_UPLOAD_IMPLEMENTATION_PLAN.md` | GCS photo upload plan |

### Mobile
| File | Purpose |
|------|---------|
| `frontend/mobile/README.md` | Mobile app setup and dev guide |
| `frontend/mobile/PROJECT_SUMMARY.md` | Mobile feature overview |
| `frontend/mobile/TESTING.md` | Manual + automated testing guide |
| `frontend/mobile/GOOGLE_OAUTH_SETUP.md` | Google OAuth setup |
| `frontend/mobile/PHOTO_UPLOAD_INTEGRATION.md` | Photo upload component guide |
| `frontend/mobile/docs/BACKEND_SWITCHING.md` | Switching between local and deployed backend |
| `frontend/mobile/docs/DEPLOYMENT_ENVIRONMENTS.md` | Mobile deployment environments |

### Web
| File | Purpose |
|------|---------|
| `frontend/web/README.md` | Web app setup |
| `frontend/web/WEB_DASHBOARD_GUIDE.md` | Web dashboard feature guide |
| `frontend/web/DEPLOYMENT_SETUP.md` | Web deployment setup |

### Future Phases (Service 1 Analytics)
| File | Purpose |
|------|---------|
| `docs/future-phases/SERVICE_1_ANALYTICS.md` | Complete Service 1 analytics guide (architecture, roadmap, API) |

### Historical
| File | Purpose |
|------|---------|
| `docs/phase-completions/HISTORY.md` | Completed phases summary (Phases 1-4) |
| `docs/audits-reviews/BACKEND_SECURITY_PERFORMANCE_AUDIT.md` | Security audit (Oct 2025, remediated Dec 2025) |
| `docs/audits-reviews/COMPREHENSIVE_TESTING_ASSESSMENT.md` | Testing assessment (Dec 2025) |

---

## Documentation Standards

### Agent Retrieval

- For startup, run `npm run knowledge:rebuild-if-stale`, then `npm run knowledge:context -- "<intent>" --limit 1`, verify live git state, and stop to ask what to work on.
- For planning, implementation, current-status follow-up, continue, and handoff prompts after task selection, run `npm run knowledge:context -- "<intent>" --limit 3`.
- Every implementation `<proposed_plan>` should include a short `Model Routing` line copied from `knowledge:context` or `selectModelForTask`.
- Substantial implementation handoffs should include `Recommended model`, `Reasoning effort`, `Tier`, `Confidence`, and `Reason`; `npm run knowledge:model-routing -- "<intent>"` prints this advisory block.
- Use cited line ranges as the default read boundary after task selection. Do not open full Markdown files unless implementation detail is genuinely needed.
- Run `npm run knowledge:query -- "<topic>"` only for deeper investigation.
- Rebuild with `npm run knowledge:build` when indexed sources change.
- Markdown remains canonical storage. The SQLite database is a generated retrieval/cache layer, and token savings come from bounded retrieval rather than deleting Markdown.
- Use retrieval results as source-grounded pointers; verify current status with live git state and cited `STATUS_REPORT.md` ranges.

### When to Update

| Trigger | Files to Update |
|---------|----------------|
| Feature shipped | `STATUS_REPORT.md` |
| Knowledge source added or removed | `.agents/knowledge/sources.json`, then `npm run knowledge:build` |
| New API endpoint | `docs/PARKPAL_SYSTEM_ARCHITECTURE.md` + Swagger |
| Tech stack change | `TECH_STACK_SUMMARY.md` |
| Infrastructure change | `docs/DEPLOYMENT.md`, `docs/ENVIRONMENTS.md` |
| New env variable | `docs/ENVIRONMENTS.md` |
| Phase complete | `STATUS_REPORT.md`, `ROADMAP.md`, `docs/phase-completions/HISTORY.md` |

### Rules

- `STATUS_REPORT.md` is the primary source of truth for project state
- The knowledge index is a retrieval/cache layer, not a replacement for source docs
- Never duplicate content across files — link instead
- Historical/one-time records go in `docs/phase-completions/`, `docs/plans/`, or `docs/implementations/`
- Delete files that have been fully superseded rather than leaving stale docs
- Keep canonical reusable docs simple and descriptive; dated filenames are allowed only for one-time implementation plans or historical records
