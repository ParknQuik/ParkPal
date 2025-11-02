# API Contract Testing Guide

## Overview

This document describes the API contract testing system that prevents frontend-backend API mismatches. The system automatically validates that all frontend API calls match the backend endpoints.

## Problem Solved

**Before:** Frontend apps would call endpoints that don't exist in the backend, causing runtime failures that were only discovered during manual testing or in production.

**After:** Automated contract validation catches mismatches during development, preventing deployments with incompatible APIs.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Backend       │────▶│ API Contract     │◀────│  Frontend       │
│   Routes        │     │ (JSON)           │     │  API Clients    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                        │                         │
        │                        ▼                         │
        │               ┌──────────────────┐              │
        └──────────────▶│   Validator      │◀─────────────┘
                        │   Script         │
                        └──────────────────┘
                                 │
                                 ▼
                         ✅ Pass / ❌ Fail
```

## Components

### 1. Contract Generator (`backend/scripts/generate-api-contract.js`)

**Purpose:** Extract all API endpoints from backend route files and generate a contract file.

**How it works:**
- Scans all route files in `backend/routes/`
- Parses HTTP method declarations (GET, POST, PUT, DELETE, PATCH)
- Extracts endpoint paths
- Generates `backend/api-contract.json`

**Usage:**
```bash
cd /Users/bryanangeloyaneza/Projects
npm run contract:generate
```

**Output:** `backend/api-contract.json`
```json
{
  "generatedAt": "2025-11-02T11:47:18.585Z",
  "version": "1.0.0",
  "baseUrl": "/api/v1",
  "endpoints": [
    {
      "method": "GET",
      "path": "/auth/me",
      "source": "auth.js"
    },
    ...
  ]
}
```

### 2. Contract Validator (`scripts/validate-api-contract.js`)

**Purpose:** Compare frontend API calls against the backend contract.

**How it works:**
- Loads backend contract (`backend/api-contract.json`)
- Scans frontend API client files:
  - Web: `frontend/web/src/api.ts`
  - Mobile: `frontend/mobile/src/services/api.ts`
- Extracts all `api.get()`, `api.post()`, etc. calls
- Compares frontend calls against backend endpoints
- Reports mismatches

**Usage:**
```bash
npm run contract:validate
```

**Example Output:**
```
╔══════════════════════════════════════════╗
║   API Contract Validation Tool          ║
╚══════════════════════════════════════════╝

✓ Loaded backend contract: 25 endpoints

📱 Web Frontend
   Found 15 API calls

📱 Mobile Frontend
   Found 31 API calls

═══ Validation Results ═══

❌ Found 6 mismatches:

1. [Mobile] GET /parking/spots
   Expected: GET /api/v1/parking/spots
   Status: NOT FOUND in backend

...

═══ Summary ═══
Backend endpoints: 25
Frontend API calls: 46
Mismatches: 6

⚠️  Contract validation failed!
Fix these mismatches before deploying.
```

### 3. Automated Test (`package.json` scripts)

**Purpose:** Run contract validation automatically before tests/builds.

**Scripts:**
```json
{
  "scripts": {
    "contract:generate": "cd backend && node scripts/generate-api-contract.js",
    "contract:validate": "node scripts/validate-api-contract.js",
    "contract:test": "npm run contract:generate && npm run contract:validate",
    "pretest": "npm run contract:test"
  }
}
```

**Integration points:**
- `pretest`: Runs before `npm test` (blocks tests if contract fails)
- CI/CD: Add `npm run contract:test` to CI pipeline
- Pre-commit hook: Optional - validate on every commit

## Workflow

### Development Workflow

#### 1. Adding a New Backend Endpoint

```bash
# 1. Add route to backend
# Edit backend/routes/marketplace.js
app.get('/marketplace/new-endpoint', controller.newMethod);

# 2. Regenerate contract
npm run contract:generate

# 3. Validate (should show mismatch if frontend not updated)
npm run contract:validate
```

#### 2. Adding a New Frontend API Call

```bash
# 1. Add API call to frontend
# Edit frontend/mobile/src/services/api.ts
export const newAPI = {
  getData: () => api.get('/new-endpoint')
};

# 2. Validate contract
npm run contract:validate

# 3. If mismatch, add backend endpoint first!
```

#### 3. Before Committing Code

```bash
# Run full contract test
npm run contract:test

# Fix any mismatches before committing
```

### CI/CD Integration

Add to `.github/workflows/test.yml`:
```yaml
- name: Contract Validation
  run: npm run contract:test

- name: Run Tests
  run: npm test
  # pretest hook will run contract:test automatically
```

## Common Issues & Solutions

### Issue 1: Path Mismatch - `/parking/spots` vs `/slots`

**Problem:**
```
[Mobile] GET /parking/spots
Expected: GET /api/v1/parking/spots
Status: NOT FOUND in backend
```

**Cause:** Frontend uses `/parking/spots` but backend has `/slots`

**Solutions:**
1. **Update Frontend** (Recommended):
   ```typescript
   // Change from:
   getSpots: () => api.get('/parking/spots')
   // To:
   getSpots: () => api.get('/slots')
   ```

2. **Add Backend Alias:**
   ```javascript
   // In backend/routes/parking.js
   app.get('/parking/spots', parkingController.getSlots);
   ```

### Issue 2: Missing Endpoint

**Problem:**
```
[Mobile] GET /users/profile
Expected: GET /api/v1/users/profile
Status: NOT FOUND in backend
```

**Solution:** Add the missing endpoint to backend
```javascript
// backend/routes/users.js
app.get('/users/profile', authenticate, userController.getProfile);
```

### Issue 3: Parameter Patterns Not Matching

**Problem:**
```
Frontend: GET /listings/${id}
Backend:  GET /listings/:id
```

**Solution:** Validator already normalizes `${id}` to `:id`, no action needed.

## Best Practices

### 1. Run Contract Tests Before Committing
```bash
git add .
npm run contract:test  # Check for mismatches
git commit -m "Your message"
```

### 2. Update Contract When Adding Routes

**Always:**
```bash
# After adding backend route
npm run contract:generate
git add backend/api-contract.json
git commit -m "Add new API endpoint"
```

### 3. Keep Frontend and Backend in Sync

**Good Practice:**
```
1. Add backend endpoint
2. Test with Postman/curl
3. Update API contract
4. Add frontend API call
5. Validate contract
```

**Bad Practice:**
```
1. Add frontend API call
2. Deploy frontend
3. Add backend endpoint later ❌ (causes runtime errors)
```

### 4. Document Breaking Changes

When changing existing endpoints:
```javascript
// OLD: GET /api/v1/users/:id
// NEW: GET /api/v1/users/:id/profile

// 1. Add new endpoint
// 2. Mark old as deprecated
// 3. Update frontend
// 4. Remove old endpoint after migration
```

## Limitations

### Current Limitations

1. **Dynamic Paths:** Cannot detect paths built from variables
   ```typescript
   const path = `/users/${userId}`;  // Not detected
   api.get(path);
   ```

2. **Conditional Endpoints:** Cannot validate endpoints behind feature flags
   ```typescript
   if (featureFlag) {
     api.get('/new-feature');  // May not exist yet
   }
   ```

3. **External APIs:** Only validates internal APIs, not third-party

### Workarounds

1. **Dynamic Paths:** Use explicit function calls
   ```typescript
   // Instead of dynamic path
   const getUserPath = (id) => api.get(`/users/${id}`);

   // Use explicit method
   api.get('/users/:id');  // Detected by validator
   ```

2. **Feature Flags:** Add comment to skip validation
   ```typescript
   // @contract-skip - feature flag gated
   if (featureEnabled) {
     api.get('/experimental-endpoint');
   }
   ```

## Maintenance

### Weekly Tasks
- Run `npm run contract:test` on main branch
- Review and fix any new mismatches

### Before Release
1. Generate fresh contract: `npm run contract:generate`
2. Validate all frontends: `npm run contract:validate`
3. Fix all mismatches before deploying

### After Removing Endpoints
1. Remove from backend routes
2. Regenerate contract
3. Update frontends to remove old API calls
4. Validate contract

## Troubleshooting

### Validator Shows False Positives

**Symptom:** Validator reports mismatch but endpoint exists

**Cause:** Contract generator didn't detect the route

**Solution:**
1. Check route syntax in backend file
2. Ensure route uses `app.get('/path', ...)` pattern
3. Regenerate contract: `npm run contract:generate`
4. If still failing, add route manually to contract

### Contract Generation Fails

**Symptom:** `generate-api-contract.js` errors

**Cause:** Invalid JavaScript syntax in route files

**Solution:**
1. Check syntax errors in route files
2. Ensure all route files are valid JavaScript
3. Check for missing closing braces/brackets

### Validation Takes Too Long

**Symptom:** `npm run contract:validate` is slow

**Cause:** Scanning large frontend files

**Solution:**
1. Optimize regex patterns in validator
2. Cache parsed results
3. Only scan relevant files (skip node_modules)

## Future Enhancements

### Planned Features
1. **Type validation:** Validate request/response schemas
2. **Authentication checks:** Detect missing auth middleware
3. **Parameter validation:** Check query params, body fields
4. **OpenAPI generation:** Auto-generate Swagger docs from contract
5. **VS Code extension:** Real-time validation in editor
6. **Contract versioning:** Track API changes over time

### Integration Opportunities
1. **Pact:** Contract testing framework
2. **Postman:** Generate Postman collections from contract
3. **TypeScript:** Generate TypeScript types from contract
4. **GraphQL:** Extend to GraphQL schema validation

## Support

### Getting Help

**If validation fails:**
1. Review mismatch details in validator output
2. Check this documentation for common issues
3. Run `npm run contract:generate` to refresh contract
4. Verify endpoint exists in backend routes

**If you need to bypass validation temporarily:**
```bash
# Skip contract validation (use with caution!)
SKIP_CONTRACT=1 npm test
```

**Report issues:**
- Create issue in project repo
- Include validator output
- Describe expected vs actual behavior

---

## Quick Reference

### Commands
```bash
# Generate contract from backend
npm run contract:generate

# Validate frontend against contract
npm run contract:validate

# Full contract test (generate + validate)
npm run contract:test

# Run tests (includes contract validation)
npm test
```

### Files
- **Contract:** `backend/api-contract.json`
- **Generator:** `backend/scripts/generate-api-contract.js`
- **Validator:** `scripts/validate-api-contract.js`
- **Config:** `package.json` (scripts section)

### Exit Codes
- `0` - Contract validation passed
- `1` - Contract validation failed (mismatches found)

---

**Last Updated:** 2025-11-02
**Version:** 1.0.0
