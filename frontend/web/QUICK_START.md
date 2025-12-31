# ParkPal Web Frontend - Quick Start Guide

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### Installation

```bash
cd /Users/bryanangeloyaneza/Documents/GitHub/ParkPal/frontend/web
npm install
```

### Development

```bash
# Start development server
npm run dev

# Open browser at http://localhost:5173
```

### Testing

```bash
# Run all tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Type check
npm run type-check
```

### Building

```bash
# Development build
npm run build

# Production build (optimized)
npm run build:prod

# Preview production build
npm run preview
```

---

## New Features (Phase 4)

### 1. Toast Notifications

```tsx
import { useToast } from './contexts/ToastContext';

function MyComponent() {
  const { showSuccess, showError } = useToast();

  const handleAction = () => {
    try {
      // Do something
      showSuccess('Action completed successfully!');
    } catch (error) {
      showError('Action failed. Please try again.');
    }
  };
}
```

### 2. Lazy Loading Images

```tsx
import LazyImage from './components/LazyImage';

function MyComponent() {
  return (
    <LazyImage
      src="/path/to/image.jpg"
      alt="Description"
      width="100%"
      height="200px"
    />
  );
}
```

### 3. Health Monitoring

```tsx
import HealthCheck from './components/HealthCheck';

function App() {
  return (
    <>
      <HealthCheck checkInterval={60000} showNotifications={true} />
      {/* Rest of app */}
    </>
  );
}
```

### 4. Performance Monitoring

```tsx
import { markPerformance, measurePerformance } from './utils/performance';

function MyComponent() {
  useEffect(() => {
    markPerformance('component-mount');

    // Do expensive operation

    markPerformance('component-ready');
    const duration = measurePerformance('component-load', 'component-mount', 'component-ready');
    console.log(`Component loaded in ${duration}ms`);
  }, []);
}
```

---

## Environment Variables

Create `.env` file for development:

```bash
VITE_API_BASE_URL=http://localhost:3001/api
VITE_GOOGLE_MAPS_API_KEY=your_dev_key
VITE_PAYMONGO_PUBLIC_KEY=your_dev_key
VITE_APP_ENV=development
```

Create `.env.production` for production:

```bash
VITE_API_BASE_URL=https://api.parkpal.com/api
VITE_GOOGLE_MAPS_API_KEY=your_prod_key
VITE_PAYMONGO_PUBLIC_KEY=your_prod_key
VITE_APP_ENV=production
VITE_ENABLE_ANALYTICS=true
```

---

## Deployment

### Docker

```bash
# Build image
docker build -t parkpal-web:latest .

# Run container
docker run -p 80:80 parkpal-web:latest

# Access at http://localhost
```

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Manual

```bash
# Build
npm run build:prod

# Upload dist/ folder to your hosting provider
```

---

## Project Structure

```
frontend/web/
├── src/
│   ├── components/        # Reusable components
│   │   ├── ErrorBoundary.tsx
│   │   ├── LazyImage.tsx
│   │   ├── HealthCheck.tsx
│   │   └── PaymentMethodCard.tsx
│   ├── contexts/          # React contexts
│   │   ├── AuthContext.tsx
│   │   └── ToastContext.tsx
│   ├── screens/           # Page components
│   │   ├── Login.tsx
│   │   ├── Payment.jsx
│   │   ├── NotFound.tsx
│   │   └── ServerError.tsx
│   ├── utils/             # Utilities
│   │   └── performance.ts
│   ├── test/              # Test utilities
│   │   ├── setup.ts
│   │   ├── accessibility.test.tsx
│   │   └── integration/
│   ├── api.ts             # API client
│   ├── App.tsx            # Main app component
│   └── index.tsx          # Entry point
├── public/                # Static assets
│   ├── service-worker.js
│   └── manifest.json
├── .github/
│   └── workflows/
│       └── deploy.yml     # CI/CD pipeline
├── Dockerfile             # Docker configuration
├── nginx.conf             # Nginx configuration
├── vite.config.mjs        # Vite configuration
├── vitest.config.ts       # Test configuration
└── package.json           # Dependencies
```

---

## Key Improvements

### Performance
- Route-based code splitting
- Lazy loading images
- Service worker for offline support
- PWA capabilities
- Optimized vendor chunks

### Error Handling
- API retry logic (3 attempts)
- Toast notifications
- 404 and 500 error pages
- Health monitoring
- Graceful degradation

### Testing
- 26+ test cases
- Unit tests
- Integration tests
- Accessibility tests
- 99%+ coverage target

### SEO & Accessibility
- Meta tags for social sharing
- WCAG 2.1 AA compliance
- Semantic HTML
- ARIA labels
- Keyboard navigation

### Security
- CSP headers
- XSS protection
- HTTPS enforcement
- Secure environment variables
- No exposed secrets

---

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run test            # Run tests
npm run test:coverage   # Test coverage
npm run type-check      # TypeScript check

# Production
npm run build:prod      # Production build
npm run preview         # Preview build
npm run build:analyze   # Analyze bundle

# Docker
docker build -t parkpal-web .
docker run -p 80:80 parkpal-web
```

---

## Troubleshooting

### Build Errors

**Issue:** TypeScript errors during build
```bash
# Fix
npm run type-check
# Fix reported errors
```

**Issue:** Missing dependencies
```bash
# Fix
rm -rf node_modules package-lock.json
npm install
```

### Test Failures

**Issue:** Tests failing
```bash
# Run specific test
npm run test -- src/screens/__tests__/Payment.test.tsx

# Run with verbose output
npm run test -- --reporter=verbose
```

### Performance Issues

**Issue:** Slow build times
```bash
# Clear cache
rm -rf node_modules/.vite dist

# Rebuild
npm run build
```

---

## Support

- Documentation: `/frontend/web/DEPLOYMENT.md`
- Production Checklist: `/frontend/web/PRODUCTION_READINESS.md`
- Implementation Summary: `/frontend/web/PHASE4_IMPLEMENTATION_SUMMARY.md`

---

**Last Updated:** December 31, 2025
