# Security Rules

**Type:** Mandatory security checks

## Critical Rules (Must Follow)

### 1. No Hardcoded Secrets

❌ **NEVER** hardcode secrets, credentials, or sensitive data

```javascript
// ❌ VIOLATION
const JWT_SECRET = "my-secret-key-123";
const DB_PASSWORD = "admin123";
const API_KEY = "sk_live_abc123";

// ✅ CORRECT
const JWT_SECRET = process.env.JWT_SECRET;
const DB_PASSWORD = process.env.DATABASE_PASSWORD;
const API_KEY = process.env.PAYMONGO_API_KEY;

// ✅ VALIDATE
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}
```

### 2. Input Validation Required

❌ **NEVER** trust user input without validation

```javascript
// ❌ VIOLATION
app.post('/api/users', (req, res) => {
  const user = await prisma.user.create({ data: req.body });
});

// ✅ CORRECT
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(12).required(),
  name: Joi.string().max(100).required()
});

app.post('/api/users', validateRequest(userSchema), (req, res) => {
  const user = await prisma.user.create({ data: req.validatedData });
});
```

### 3. SQL Injection Prevention

❌ **NEVER** concatenate user input into SQL queries

```javascript
// ❌ VIOLATION
const query = `SELECT * FROM users WHERE email = '${email}'`;
db.query(query);

// ✅ CORRECT (Using Prisma)
const user = await prisma.user.findUnique({ where: { email } });

// ✅ CORRECT (Raw query with parameters)
const users = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;
```

### 4. Authentication Required

❌ **NEVER** expose protected endpoints without authentication

```javascript
// ❌ VIOLATION
app.get('/api/bookings', bookingController.getAll);

// ✅ CORRECT
app.get('/api/bookings', requireAuth, bookingController.getAll);

// ✅ CORRECT (with authorization)
app.delete('/api/bookings/:id',
  requireAuth,
  requireRole('admin', 'host'),
  bookingController.delete
);
```

### 5. Password Security

❌ **NEVER** store plain text passwords

```javascript
// ❌ VIOLATION
const user = await prisma.user.create({
  data: { email, password }
});

// ✅ CORRECT
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
const user = await prisma.user.create({
  data: { email, password: hashedPassword }
});
```

### 6. XSS Prevention

❌ **NEVER** render unsanitized user input

```javascript
// ❌ VIOLATION (React)
<div dangerouslySetInnerHTML={{ __html: userComment }} />

// ✅ CORRECT
<div>{userComment}</div> // React auto-escapes

// ✅ CORRECT (If HTML needed)
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userComment) }} />
```

### 7. Rate Limiting

❌ **NEVER** leave sensitive endpoints without rate limiting

```javascript
// ❌ VIOLATION
app.post('/api/auth/login', authController.login);

// ✅ CORRECT
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});

app.post('/api/auth/login', loginLimiter, authController.login);
```

### 8. Secure Headers

❌ **NEVER** run Express without security headers

```javascript
// ❌ VIOLATION
const app = express();
// No security headers

// ✅ CORRECT
const helmet = require('helmet');
app.use(helmet());

// ✅ CUSTOM CONFIG
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));
```

### 9. CORS Configuration

❌ **NEVER** use wildcard CORS in production

```javascript
// ❌ VIOLATION
app.use(cors()); // Allows all origins

// ✅ CORRECT
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

### 10. Error Message Disclosure

❌ **NEVER** expose sensitive error details

```javascript
// ❌ VIOLATION
catch (error) {
  res.status(500).json({
    error: error.message,
    stack: error.stack,
    query: sqlQuery
  });
}

// ✅ CORRECT
catch (error) {
  logger.error('Database error', { error, userId: req.user?.id });

  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error.message;

  res.status(500).json({ error: message });
}
```

## Security Checklist (Before Deploy)

- [ ] No hardcoded secrets
- [ ] All inputs validated
- [ ] SQL injection protected
- [ ] XSS prevention implemented
- [ ] CSRF protection enabled
- [ ] Rate limiting on auth endpoints
- [ ] Security headers configured (helmet.js)
- [ ] CORS properly configured
- [ ] Error messages sanitized
- [ ] HTTPS enforced in production
- [ ] JWT tokens expire (1h max)
- [ ] Sensitive data encrypted at rest
- [ ] Dependencies up to date (npm audit)
- [ ] Logs don't contain sensitive data

## Automated Security Checks

```bash
# Run before every commit
npm audit                    # Check for vulnerabilities
npm run lint:security       # ESLint security plugin

# Run in CI/CD
npm audit --audit-level=high
npx snyk test               # Snyk security scan
```

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [backend/SECURITY_HARDENING.md](/backend/SECURITY_HARDENING.md)
- [.claude/agents/security-reviewer.md](../agents/security-reviewer.md)

## Enforcement

**Violations of these rules will block PR merges in GitHub Actions.**

See `.github/workflows/security-scan.yml` for automated enforcement.
