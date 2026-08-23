# API Versioning Guide

## Overview

ParknQuik API uses URL-based versioning. This keeps old clients working while the API changes safely.

## Current Status

- **Current Version:** v1
- **Base URL:** `/api/v1`
- **Legacy URL:** `/api` (deprecated, sunset: 2026-12-31)

## URL Structure

### New Format (Recommended)
```
https://api.parknquik.com/api/v1/{resource}
```

### Legacy Format (Deprecated)
```
https://api.parknquik.com/api/{resource}
```

## Available Endpoints

### V1 Endpoints

All endpoints are now available under `/api/v1`:

#### Authentication
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `PUT /api/v1/auth/password`

#### Marketplace
- `GET /api/v1/marketplace/search`
- `POST /api/v1/marketplace/listings`
- `POST /api/v1/marketplace/bookings`
- `POST /api/v1/marketplace/qr/checkin`
- `POST /api/v1/marketplace/qr/checkout`
- `POST /api/v1/marketplace/reviews`
- `GET /api/v1/marketplace/host/earnings`

#### Parking (Legacy - use Marketplace instead)
- `GET /api/v1/slots`
- `GET /api/v1/slots/:id`
- `POST /api/v1/slots` (deprecated → use `/api/v1/marketplace/listings`)
- `PUT /api/v1/slots/:id` (deprecated → use `/api/v1/marketplace/listings/:id`)
- `DELETE /api/v1/slots/:id`

#### Payments
- `POST /api/v1/payments`
- `GET /api/v1/payments`
- `GET /api/v1/payments/:id`

#### Configuration
- `GET /api/v1/config/maps-api-key`
- `GET /api/v1/config/app`

#### Alerts
- `GET /api/v1/alerts`

## Migration Guide

### For Frontend Applications

#### Before (Legacy)
```javascript
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

#### After (V1)
```javascript
const response = await fetch('http://localhost:3001/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
```

### Deprecation Warnings

When using legacy `/api` endpoints, you'll receive deprecation headers:

```
Deprecation: true
X-API-Deprecated: true
X-API-Alternative: /api/v1
Sunset: 2026-12-31
```

Response body will include:
```json
{
  "data": {...},
  "_deprecation": {
    "message": "Please migrate to /api/v1. The /api prefix without version will be removed on December 31, 2026.",
    "alternative": "/api/v1",
    "sunset": "2026-12-31",
    "documentation": "https://docs.parknquik.com/api/migration"
  }
}
```

## Version Detection

Check available API versions:

```bash
curl http://localhost:3001/
```

Response:
```json
{
  "name": "ParknQuik API",
  "status": "healthy",
  "version": "1.0.0",
  "apiVersions": {
    "current": "v1",
    "available": ["v1"],
    "deprecated": {
      "/api": {
        "alternative": "/api/v1",
        "sunset": "2026-12-31"
      }
    }
  },
  "endpoints": {
    "health": "/health",
    "docs": "/api-docs",
    "apiV1": "/api/v1",
    "legacyApi": "/api (deprecated)"
  }
}
```

## Best Practices

### 1. Always Use Versioned URLs
```javascript
// ✅ Good
const API_BASE = 'http://localhost:3001/api/v1';

// ❌ Bad
const API_BASE = 'http://localhost:3001/api';
```

### 2. Handle Deprecation Warnings
```javascript
const response = await fetch(url);

// Check for deprecation
const deprecated = response.headers.get('X-API-Deprecated');
if (deprecated === 'true') {
  const alternative = response.headers.get('X-API-Alternative');
  const sunset = response.headers.get('Sunset');
  
  console.warn(`Warning: This endpoint is deprecated.`);
  console.warn(`Use ${alternative} instead.`);
  console.warn(`Sunset date: ${sunset}`);
}
```

### 3. Use Environment Variables
```javascript
// .env
VITE_API_BASE_URL=http://localhost:3001/api/v1

// api.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL;
```

## Breaking Changes Policy

### Minor Versions (v1.1, v1.2, etc.)
- ✅ New endpoints
- ✅ New optional parameters
- ✅ New response fields
- ❌ No breaking changes

### Major Versions (v2, v3, etc.)
- ✅ Breaking changes allowed
- ✅ Backward incompatible updates
- ⚠️ Minimum 12-month overlap with previous version

## Version Support Policy

| Version | Status | Support Until | Notes |
|---------|--------|---------------|-------|
| v1 | ✅ Current | Active | Recommended |
| /api (no version) | ⚠️ Deprecated | 2026-12-31 | Use /api/v1 |

## Testing

### Test V1 Endpoint
```bash
curl http://localhost:3001/api/v1/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test Legacy Endpoint (with deprecation warning)
```bash
curl -i http://localhost:3001/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Check headers for deprecation warnings
```

## FAQ

### Q: Do I need to update my frontend immediately?
**A:** No, legacy `/api` endpoints will work until December 31, 2026. However, we recommend updating as soon as possible.

### Q: Will v1 endpoints ever change?
**A:** No breaking changes will be made to v1. New features may be added, but existing functionality will remain compatible.

### Q: What happens on the sunset date?
**A:** After December 31, 2026, `/api` (without version) will return 410 Gone. Use `/api/v1` instead.

### Q: How do I know which version my app is using?
**A:** Check your API base URL. If it includes `/v1`, you're using the current version.

### Q: Can I use both /api and /api/v1?
**A:** Yes, they currently point to the same endpoints. However, `/api` shows deprecation warnings.

## Migration Checklist

- [ ] Update API base URL from `/api` to `/api/v1`
- [ ] Update all fetch/axios calls
- [ ] Update environment variables
- [ ] Update documentation
- [ ] Test all endpoints
- [ ] Deploy to staging
- [ ] Monitor for deprecation warnings
- [ ] Deploy to production

## Support

For migration assistance:
- Documentation: https://docs.parknquik.com
- Issues: https://github.com/ParknQuik/ParkPal/issues
- Email: dev@parknquik.com
