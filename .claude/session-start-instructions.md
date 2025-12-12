# Session Start Instructions

When the user says "start", follow these steps:

## 1. Review All Markdown Files
- Find all `.md` files in the project using Glob
- Read each markdown file to understand:
  - Project progress
  - Architecture decisions
  - Security audits
  - Feature implementations
  - Action items or TODOs

## 2. Key Files to Check
- `frontend/mobile/PROJECT_SUMMARY.md` - Mobile app status
- `BACKEND_SECURITY_PERFORMANCE_AUDIT.md` - Security audit (note: some issues already fixed)
- `backend/PASSWORD_POLICY.md` - Password requirements
- `backend/POSTGRESQL_MIGRATION.md` - Database migration status
- `CONTRACT_TESTING_SUMMARY.md` - API contract testing
- `docs/PARKPAL_SYSTEM_ARCHITECTURE.md` - System architecture
- Any other `.md` files in the project root or subdirectories

## 3. Provide Summary
After reviewing, provide a concise summary of:
- Current project state
- Recent work completed
- Outstanding tasks or issues
- Any security/performance concerns noted

## 4. Ask What to Work On
Conclude by asking the user what they'd like to focus on in this session.

---

## Project Status Quick Reference (Updated: 2025-12-11)

### ✅ Completed Major Items
- **Mobile App**: Complete with PayMongo payment integration (GCash + Cards)
- **PostgreSQL Migration**: Migrated from SQLite to PostgreSQL
- **Security Hardening**: Rate limiting, CORS, helmet.js, request size limits
- **Password Policy**: OWASP-compliant with breach checking
- **Contract Testing**: Automated frontend-backend API validation system
- **API Versioning**: /api/v1 with legacy /api support
- **GCP Integration**: Secret Manager for credentials

### 🔴 Critical Issues (Production Blockers)
1. **JWT Secret**: Still using development placeholder (needs rotation for production)
2. **Input Validation**: Joi installed but not fully implemented across all endpoints
3. **WebSocket Authentication**: Not implemented yet

### 🟡 Performance Optimizations (P1)
1. Database indexes - not yet added (10-100x speed improvement expected)
2. Redis caching - not implemented (50% DB load reduction potential)
3. N+1 query problems in controllers
4. Pagination missing on some list endpoints

### 📋 API Contract Gaps
- 31 mismatches between mobile frontend and backend
- Need to align paths (`/parking/spots` vs `/slots`)
- Missing endpoints: bookings detail/cancel, user payment methods

### 🎯 Current Branch
- Branch: `feat/mobile-payment-ui`
- Status: Clean working directory
- Last commit: "Complete booking flow and marketplace integration"

---

## Git Commit Policy

**IMPORTANT:** Always inform the user before committing or pushing changes.

### Before `git commit`:
1. Show a summary of what will be committed
2. Ask for explicit confirmation: "Ready to commit these changes?"
3. Wait for user approval before running `git commit`

### Before `git push`:
1. Inform the user about the commits to be pushed
2. Ask for explicit confirmation: "Ready to push to remote?"
3. Wait for user approval before running `git push`

### Exception:
Only commit/push automatically if the user explicitly says:
- "commit and push this"
- "go ahead and commit"
- "auto-commit"
- Or similar clear permission
