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
- **Mobile App**: Complete with PayMongo payment integration (GCash, Cards, GrabPay, PayMaya)
- **Web PayMongo UI**: Complete redesign with 4 payment methods (Dec 11, 2025)
- **Booking → Payment Flow**: Mobile and web fully connected
- **PostgreSQL Migration**: Migrated from SQLite to PostgreSQL
- **Security Hardening**: Rate limiting, CORS, helmet.js, request size limits
- **Password Policy**: OWASP-compliant with breach checking
- **Contract Testing**: Automated frontend-backend API validation system
- **API Versioning**: /api/v1 with legacy /api support
- **GCP Integration**: Secret Manager for credentials
- **Backend Tests**: 150 tests passing (100% pass rate)

### 🎉 Latest Achievement (Dec 11, 2025)
**Phase 1 Complete (100%)** - PayMongo Integration
- ✅ Mobile: ReservationScreen → PaymentScreen navigation
- ✅ Web: Complete Payment.jsx redesign with PayMongo API
- ✅ Both platforms: 4 payment methods integrated
- ✅ Documentation: PAYMONGO_INTEGRATION_COMPLETE.md created

### 🔴 Critical Issues (Production Blockers)
1. **JWT Secret**: Still using development placeholder (needs rotation for production)
2. **Input Validation**: Joi installed and implemented (✅ Complete per git history)
3. **WebSocket Authentication**: Not implemented yet

### 🟡 Performance Optimizations (P1)
1. Database indexes - not yet added (10-100x speed improvement expected)
2. Redis caching - not implemented (50% DB load reduction potential)
3. N+1 query problems in controllers
4. Pagination - implemented on some endpoints, missing on others

### 📋 API Contract Gaps
- 31 mismatches between mobile frontend and backend
- Need to align paths (`/parking/spots` vs `/slots`)
- Missing endpoints: bookings detail/cancel, user payment methods

### 🎯 Current Branch
- Branch: `feat/paymongo-integration-complete`
- Status: Committed, pending push (GitHub secret scanning block)
- Last commit: "feat(payments): Complete PayMongo integration for mobile and web"
- Files changed: 4 files, 587 insertions, 69 deletions

### 📅 Roadmap Progress
- **Phase 1 (Week 1)**: ✅ 100% Complete (Dec 11, 2025)
- **Phase 2 (Weeks 2-4)**: 0% - Mobile core features (next up)
- **Phase 3 (Weeks 5-7)**: 0% - UX polish & testing
- **Phase 4 (Weeks 8-10)**: 0% - Beta launch
- **Phase 5 (Weeks 11-12)**: 0% - Public launch

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
