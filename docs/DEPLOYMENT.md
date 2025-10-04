# ParkPal Deployment Guide

## Table of Contents
1. [Development Setup](#development-setup)
2. [Production Deployment](#production-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Database Migration](#database-migration)
5. [Troubleshooting](#troubleshooting)

## Development Setup

### Prerequisites
- Node.js 16+ and npm
- Git
- For mobile: Expo Go app or iOS/Android simulator

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd Projects
```

2. **Start Backend**
```bash
cd backend
./start.sh
```

3. **Start Web Frontend**
```bash
cd frontend/web
./start.sh
```

4. **Start Mobile App**
```bash
cd frontend/mobile
./start-mobile.sh
```

## Production Deployment

### Backend Deployment

#### Option 1: Traditional VPS (DigitalOcean, AWS EC2, etc.)

1. **Install Dependencies**
```bash
ssh user@your-server
sudo apt update
sudo apt install nodejs npm nginx
```

2. **Clone and Setup**
```bash
git clone <repository-url>
cd Projects/backend
npm install --production
```

3. **Environment Variables**
```bash
nano .env
# Set production values:
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/parkpal
JWT_SECRET=<generate-strong-secret>
NODE_ENV=production
```

4. **Database Setup**
```bash
# For PostgreSQL
sudo apt install postgresql
sudo -u postgres createdb parkpal
npx prisma migrate deploy
```

5. **Process Manager (PM2)**
```bash
npm install -g pm2
pm2 start npm --name "parkpal-api" -- start
pm2 save
pm2 startup
```

6. **Nginx Reverse Proxy**
```nginx
server {
    listen 80;
    server_name api.parkpal.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Option 2: Docker Deployment

**Dockerfile** (backend/Dockerfile):
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "start"]
```

**docker-compose.yml**:
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/parkpal
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
  
  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=parkpal
      - POSTGRES_PASSWORD=password
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Deploy:
```bash
docker-compose up -d
```

#### Option 3: Platform as a Service

**Render.com / Railway.app**:
1. Connect GitHub repository
2. Set build command: `npm install && npx prisma generate`
3. Set start command: `npm start`
4. Add environment variables
5. Add PostgreSQL database addon

**Heroku**:
```bash
heroku create parkpal-api
heroku addons:create heroku-postgresql:hobby-dev
git push heroku main
heroku run npx prisma migrate deploy
```

### Web Frontend Deployment

#### Option 1: Static Hosting (Netlify, Vercel, GitHub Pages)

1. **Build for Production**
```bash
cd frontend/web
npm run build
```

2. **Deploy to Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

3. **Configure Redirects** (_redirects file):
```
/*    /index.html   200
```

#### Option 2: Nginx Static Server

```nginx
server {
    listen 80;
    server_name parkpal.com;
    root /var/www/parkpal-web/dist;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Mobile App Deployment

#### iOS Deployment

1. **Install EAS CLI**
```bash
npm install -g eas-cli
eas login
```

2. **Configure EAS Build**
```bash
cd frontend/mobile
eas build:configure
```

3. **Build for iOS**
```bash
eas build --platform ios
```

4. **Submit to App Store**
```bash
eas submit --platform ios
```

#### Android Deployment

1. **Build APK/AAB**
```bash
eas build --platform android
```

2. **Submit to Google Play**
```bash
eas submit --platform android
```

## Environment Configuration

### Backend (.env)

```bash
# Server
PORT=3001
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:password@host:5432/parkpal

# Authentication
JWT_SECRET=<generate-with: openssl rand -base64 32>
JWT_EXPIRATION=24h

# CORS
ALLOWED_ORIGINS=https://parkpal.com,https://app.parkpal.com

# Payment Gateway (Stripe example)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@parkpal.com
SMTP_PASS=<app-password>
```

### Web Frontend (.env)

```bash
VITE_API_BASE_URL=https://api.parkpal.com
VITE_GOOGLE_MAPS_API_KEY=<your-key>
```

### Mobile App (app.json)

```json
{
  "expo": {
    "extra": {
      "apiUrl": "https://api.parkpal.com",
      "googleMapsApiKey": "<your-key>"
    }
  }
}
```

## Database Migration

### Development to Production

1. **Export Development Data**
```bash
npx prisma db pull
npx prisma generate
```

2. **Create Migration**
```bash
npx prisma migrate dev --name initial_production
```

3. **Deploy to Production**
```bash
DATABASE_URL=<production-url> npx prisma migrate deploy
```

### Backup Strategy

```bash
# PostgreSQL backup
pg_dump parkpal > backup_$(date +%Y%m%d).sql

# Restore
psql parkpal < backup_20251004.sql

# Automated daily backups
0 2 * * * pg_dump parkpal > /backups/parkpal_$(date +\%Y\%m\%d).sql
```

## Monitoring & Maintenance

### Health Checks

**Backend Health Endpoint**:
```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
```

**Uptime Monitoring**: UptimeRobot, Pingdom, or similar

### Logging

**Production Logging Setup**:
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### Performance Monitoring

- **APM**: New Relic, DataDog
- **Error Tracking**: Sentry
- **Analytics**: Google Analytics, Mixpanel

## Troubleshooting

### Common Issues

**1. CORS Errors**
```javascript
// backend/index.js
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true
}));
```

**2. Database Connection Issues**
```bash
# Check connection
npx prisma db pull

# Reset database (development only!)
npx prisma migrate reset
```

**3. Build Failures**
```bash
# Clear caches
rm -rf node_modules package-lock.json
npm install

# Frontend
rm -rf dist .vite
npm run build
```

**4. Mobile App Won't Connect**
- Ensure API URL is correct in app.json
- Check firewall rules
- Verify SSL certificate (must be valid for HTTPS)

### Debug Mode

```bash
# Backend
DEBUG=* npm start

# Enable verbose logging
LOG_LEVEL=debug npm start
```

## Security Checklist

- [ ] Environment variables not committed to Git
- [ ] Strong JWT secret (32+ characters)
- [ ] HTTPS enabled (SSL certificate)
- [ ] Database credentials secured
- [ ] API rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using Prisma)
- [ ] XSS protection headers
- [ ] Regular dependency updates (`npm audit fix`)
- [ ] Backup strategy in place

## Performance Optimization

### Backend
- Enable gzip compression
- Implement caching (Redis)
- Database query optimization
- Connection pooling

### Frontend
- Code splitting
- Image optimization
- Lazy loading
- Service worker/PWA

### Mobile
- Image caching
- Optimize bundle size
- Use Hermes engine
- ProGuard/R8 (Android)

## Scaling Considerations

### Horizontal Scaling
```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: parkpal-backend
spec:
  replicas: 3  # Scale to 3 instances
  selector:
    matchLabels:
      app: parkpal-backend
  template:
    metadata:
      labels:
        app: parkpal-backend
    spec:
      containers:
      - name: backend
        image: parkpal/backend:latest
        ports:
        - containerPort: 3001
```

### Load Balancing
- Nginx/HAProxy for load distribution
- AWS ELB/ALB or Google Cloud Load Balancer
- Database read replicas

## CI/CD Pipeline

**GitHub Actions Example** (.github/workflows/deploy.yml):
```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        cd backend
        npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Deploy to production
      run: |
        # Your deployment commands here
        ssh ${{ secrets.SERVER_USER }}@${{ secrets.SERVER_HOST }} 'cd /app && git pull && npm install && pm2 restart all'
```

## Support

For deployment assistance:
- Check documentation in `/docs` folder
- Review troubleshooting section
- Contact development team
