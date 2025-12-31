# ParkPal Web Frontend - Deployment Guide

## Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Production environment variables configured

## Environment Variables

Create a `.env.production` file with the following variables:

```bash
VITE_API_BASE_URL=https://api.parkpal.com/api
VITE_GOOGLE_MAPS_API_KEY=your_production_google_maps_api_key
VITE_PAYMONGO_PUBLIC_KEY=your_production_paymongo_public_key
VITE_APP_ENV=production
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
```

## Build Process

### 1. Install Dependencies

```bash
cd frontend/web
npm ci
```

### 2. Type Check

```bash
npm run type-check
```

### 3. Run Tests

```bash
npm run test
npm run test:coverage
```

### 4. Build for Production

```bash
npm run build:prod
```

This will:
- Minify and optimize JavaScript/CSS
- Remove console.logs
- Split code into optimized chunks
- Generate production-ready assets in `dist/`

### 5. Preview Production Build Locally

```bash
npm run preview
```

## Deployment Options

### Option 1: Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel --prod
```

3. Configure environment variables in Vercel dashboard

### Option 2: Netlify

1. Install Netlify CLI:
```bash
npm i -g netlify-cli
```

2. Deploy:
```bash
netlify deploy --prod --dir=dist
```

### Option 3: AWS S3 + CloudFront

1. Build the application:
```bash
npm run build:prod
```

2. Upload to S3:
```bash
aws s3 sync dist/ s3://your-bucket-name --delete
```

3. Invalidate CloudFront cache:
```bash
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Option 4: Docker

1. Build Docker image:
```bash
docker build -t parkpal-web:latest .
```

2. Run container:
```bash
docker run -p 80:80 parkpal-web:latest
```

## Performance Optimization Checklist

- [x] Code splitting implemented
- [x] Lazy loading for routes
- [x] Image lazy loading
- [x] Service worker for offline support
- [x] PWA manifest configured
- [x] Production build optimizations
- [x] Error boundaries implemented
- [x] API retry logic
- [x] Toast notifications
- [x] SEO meta tags
- [ ] Analytics integration (optional)
- [ ] Error tracking (Sentry) (optional)

## Post-Deployment Verification

1. **Test Critical Flows:**
   - User authentication
   - Parking space search
   - Booking creation
   - Payment processing (PayMongo)
   - Profile management

2. **Performance Checks:**
   - Page load time < 3 seconds
   - Time to interactive < 5 seconds
   - Lighthouse score > 90

3. **SEO Verification:**
   - Meta tags present
   - Open Graph tags working
   - Sitemap accessible

4. **Security Checks:**
   - HTTPS enabled
   - CSP headers configured
   - No exposed secrets in source code
   - API endpoints using HTTPS

## Monitoring

### Key Metrics to Track

1. **Performance:**
   - Page load time
   - API response times
   - Bundle size

2. **Errors:**
   - JavaScript errors
   - API failures
   - Failed payments

3. **Usage:**
   - Active users
   - Bookings created
   - Payment success rate

## Rollback Procedure

If issues are detected post-deployment:

1. Revert to previous version:
```bash
vercel rollback  # For Vercel
# OR
git revert HEAD
git push origin main
```

2. Clear CDN cache if applicable

3. Notify users of temporary issues

## Health Check Endpoint

Frontend health can be verified at:
```
GET /health
```

Returns:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-12-31T00:00:00.000Z"
}
```

## Support

For deployment issues, contact:
- DevOps team: devops@parkpal.com
- On-call engineer: Slack #parkpal-alerts
