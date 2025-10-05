# Environment Configuration Guide

This document explains how to manage different environments (development, QA, production) in the ParkPal application.

## Branch Strategy

- **main** - Production-ready code
- **dev** - Development branch for active development
- **qa** - Quality assurance/testing branch

## Environment Files

Each environment has its own configuration files:

### Backend Environment Files

Located in `/backend/`:

- `.env.development` - Development environment
- `.env.qa` - QA/Testing environment
- `.env.production` - Production environment
- `.env` - Currently active environment (git-ignored)

### Web Frontend Environment Files

Located in `/frontend/web/`:

- `.env.development` - Development environment
- `.env.qa` - QA/Testing environment
- `.env.production` - Production environment
- `.env` - Currently active environment (git-ignored)

## How to Switch Environments

### Backend

Copy the appropriate environment file to `.env`:

```bash
# For Development
cd backend
cp .env.development .env

# For QA
cd backend
cp .env.qa .env

# For Production
cd backend
cp .env.production .env
```

### Web Frontend

Copy the appropriate environment file to `.env`:

```bash
# For Development
cd frontend/web
cp .env.development .env

# For QA
cd frontend/web
cp .env.qa .env

# For Production
cd frontend/web
cp .env.production .env
```

## Environment Variables

### Backend Variables

| Variable | Description | Dev | QA | Prod |
|----------|-------------|-----|-----|------|
| `PORT` | Server port | 3001 | 3001 | 3001 |
| `NODE_ENV` | Environment name | development | qa | production |
| `DATABASE_URL` | Database connection | SQLite | PostgreSQL | PostgreSQL |
| `JWT_SECRET` | JWT signing secret | dev_secret | qa_secret | strong_secret |
| `ALLOWED_ORIGINS` | CORS origins | localhost | qa domain | prod domain |
| `LOG_LEVEL` | Logging level | debug | info | error |

### Web Frontend Variables

| Variable | Description | Dev | QA | Prod |
|----------|-------------|-----|-----|------|
| `VITE_API_BASE_URL` | Backend API URL | localhost:3001 | qa-api.parkpal.com | api.parkpal.com |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps key | - | QA key | Prod key |
| `VITE_APP_NAME` | Application name | ParkPal Dev | ParkPal QA | ParkPal |
| `VITE_ENVIRONMENT` | Environment name | development | qa | production |

## Development Workflow

### 1. Local Development

Work on the `dev` branch with development environment:

```bash
git checkout dev

# Backend
cd backend
cp .env.development .env
npm start

# Web Frontend
cd frontend/web
cp .env.development .env
npm run dev
```

### 2. QA Testing

Merge to `qa` branch and use QA environment:

```bash
git checkout qa
git merge dev

# Backend
cd backend
cp .env.qa .env
npm start

# Web Frontend
cd frontend/web
cp .env.qa .env
npm run build && npm run preview
```

### 3. Production Deployment

Merge to `main` branch and use production environment:

```bash
git checkout main
git merge qa

# Backend
cd backend
cp .env.production .env
npm start

# Web Frontend
cd frontend/web
cp .env.production .env
npm run build
```

## Database Setup by Environment

### Development (SQLite)
```bash
cd backend
npx prisma migrate dev
```

### QA/Production (PostgreSQL)

1. Create database:
```bash
createdb parkpal_qa  # or parkpal_prod
```

2. Update DATABASE_URL in .env file

3. Run migrations:
```bash
npx prisma migrate deploy
```

## Security Best Practices

1. **Never commit `.env` files to git** - They are git-ignored by default
2. **Never commit secrets** - Use placeholder values in `.env.*` template files
3. **Rotate secrets regularly** - Especially JWT_SECRET and API keys
4. **Use strong secrets in production** - Generate with `openssl rand -base64 32`
5. **Limit CORS origins** - Only allow trusted domains in production

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Setup Environment
  run: |
    if [ "${{ github.ref }}" == "refs/heads/main" ]; then
      cp .env.production .env
    elif [ "${{ github.ref }}" == "refs/heads/qa" ]; then
      cp .env.qa .env
    else
      cp .env.development .env
    fi
```

## Environment-Specific Features

### Development
- Debug logging enabled
- SQLite database
- Hot reload enabled
- Detailed error messages
- CORS allows localhost

### QA
- Info-level logging
- PostgreSQL database
- Mimics production setup
- Test payment gateway
- Limited error details

### Production
- Error-level logging only
- PostgreSQL with replication
- Optimized builds
- Live payment gateway
- Generic error messages
- Rate limiting enabled
- Monitoring/alerting enabled

## Troubleshooting

### Wrong environment variables loaded
```bash
# Check current environment
echo $NODE_ENV

# Restart server after changing .env
pkill -f "node index.js"
npm start
```

### Database connection errors
```bash
# Verify DATABASE_URL is correct
cat .env | grep DATABASE_URL

# Test database connection
npx prisma db pull
```

### CORS errors
```bash
# Check ALLOWED_ORIGINS matches your frontend URL
cat .env | grep ALLOWED_ORIGINS
```

## Additional Resources

- [Backend README](../backend/README.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](./API.md)
