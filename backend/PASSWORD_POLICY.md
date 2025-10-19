# Password Policy and Validation

## Password Requirements

All user passwords in the ParkPal application must meet the following requirements:

### Mandatory Requirements

1. **Minimum Length**: 8 characters
2. **Maximum Length**: 72 characters (bcrypt limitation)
3. **Uppercase Letter**: At least one uppercase letter (A-Z)
4. **Lowercase Letter**: At least one lowercase letter (a-z)
5. **Number**: At least one digit (0-9)
6. **Breach Check**: Password must not appear in known data breaches (via Have I Been Pwned API)

### Recommended Best Practices

- **Length**: Use at least 12 characters for better security (warned but not enforced)
- **Special Characters**: Include special characters like `!@#$%^&*()` (warned but not enforced)
- **Avoid Patterns**: Avoid repeated characters (e.g., `aaaa111`) (warned but not enforced)

## Security Features

### Breach Detection
All passwords are checked against the Have I Been Pwned database using the k-anonymity model to ensure they haven't been exposed in known data breaches. This check is performed asynchronously and does not block registration if the API is unavailable.

### Password Hashing
- **Algorithm**: bcrypt
- **Salt Rounds**: 10
- **Storage**: Only hashed passwords are stored in the database

### Rate Limiting
- Authentication endpoints are rate-limited to 5 attempts per 15 minutes
- Prevents brute force attacks

## API Endpoints

### Register New User
**POST** `/api/auth/register`

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "MySecurePass123!",
  "role": "driver"
}
```

**Response (Success)**:
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "driver"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "warnings": [
    "Consider adding special characters for extra security"
  ]
}
```

**Response (Error)**:
```json
{
  "error": "Password must contain at least one uppercase letter"
}
```

### Change Password
**PUT** `/api/auth/password`

Requires authentication token in header:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "oldPassword": "OldPassword123!",
  "newPassword": "NewSecurePass456!"
}
```

**Response (Success)**:
```json
{
  "message": "Password changed successfully",
  "warnings": [
    "For better security, consider using at least 12 characters"
  ]
}
```

**Response (Error)**:
```json
{
  "error": "Current password is incorrect"
}
```

### Validation Errors

Common password validation error messages:

| Error Message | Cause |
|---------------|-------|
| `Password is required` | No password provided |
| `Password cannot be only whitespace` | Password is empty or only spaces |
| `Password must be at least 8 characters long` | Password too short |
| `Password must not exceed 72 characters` | Password too long |
| `Password must contain at least one uppercase letter` | Missing uppercase (A-Z) |
| `Password must contain at least one lowercase letter` | Missing lowercase (a-z) |
| `Password must contain at least one number` | Missing digit (0-9) |
| `This password has been exposed in data breaches. Please choose a different password.` | Password found in breach database |
| `Invalid email format` | Email address is malformed |
| `New password must be different from current password` | Trying to reuse current password |

## Test Credentials

**Development/Test Environment Only**

All test accounts use the password: `TestDev2024!SecurePass`

### Test Users

| Email | Password | Role |
|-------|----------|------|
| juan@example.com | TestDev2024!SecurePass | driver |
| maria@example.com | TestDev2024!SecurePass | driver |
| pedro@example.com | TestDev2024!SecurePass | host |
| ana@example.com | TestDev2024!SecurePass | host |
| carlos@example.com | TestDev2024!SecurePass | host |
| host@parkpal.com | TestDev2024!SecurePass | host |

**⚠️ WARNING**: These credentials are for development and testing only. Never use these in production.

## Implementation Details

### Password Validation Function

Located in: `services/auth.js`

```javascript
exports.validatePassword = async (password, options = {}) => {
  const {
    checkBreachedPasswords = true,
    minLength = 8,
    maxLength = 72,
  } = options;

  // Validates password and returns:
  // { valid: true/false, error?: string, warnings?: string[] }
}
```

### Password Change Validation

Password changes require:
1. Valid old password verification
2. New password must pass all validation rules
3. New password must differ from current password
4. User must be authenticated

### Email Validation

Email addresses are validated using a regex pattern:
```javascript
/^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

## Security Compliance

This password policy complies with:

- ✅ **OWASP Authentication Guidelines** (2024)
- ✅ **NIST SP 800-63B** Digital Identity Guidelines
- ⚠️ Partially compliant (minimum length is 8, recommended 12+)

### OWASP Compliance Checklist

- [x] Minimum password length enforced
- [x] Maximum password length enforced (72 chars for bcrypt)
- [x] Passwords checked against breach database
- [x] Passwords properly hashed with bcrypt
- [x] No password truncation
- [x] Clear error messages
- [x] Rate limiting on auth endpoints
- [x] No password exposure in responses

### NIST Compliance Checklist

- [x] Minimum 8 characters
- [x] Allows up to 72 characters
- [x] Breach database checking
- [x] No forced password expiration
- [x] Allows all printable ASCII characters
- [x] Proper password hashing (bcrypt)

## Future Enhancements

Potential improvements for future releases:

1. **Password Reset Flow**
   - Forgot password endpoint
   - Email-based password reset
   - Time-limited reset tokens

2. **Password History**
   - Prevent reuse of last 5 passwords
   - Track password change history

3. **Two-Factor Authentication (2FA)**
   - SMS/Email OTP
   - Authenticator app support
   - Backup codes

4. **Frontend Enhancements**
   - Real-time password strength meter
   - Visual requirements checklist
   - Password generator

5. **Advanced Security**
   - Device fingerprinting
   - Suspicious login alerts
   - Session management

## Testing

Comprehensive test suite: `tests/auth.test.js`

**Test Coverage:**
- ✅ Password length validation (min/max)
- ✅ Character composition requirements
- ✅ Email format validation
- ✅ Password change functionality
- ✅ Authentication requirements
- ✅ Security (no password exposure)
- ✅ Warnings for weak passwords

**Run tests:**
```bash
npm test -- tests/auth.test.js
```

## Troubleshooting

### "hibp package not installed" Warning

This is a warning that appears if the `hibp` package is not installed. To enable breach checking:

```bash
npm install hibp
```

If the package is installed but the API is unreachable, validation will proceed with a warning in the response.

### Password Validation Fails After Update

If existing users cannot log in after password policy updates:

1. Check that test passwords meet new requirements
2. Reseed the database: `node prisma/seed.js`
3. Update any hardcoded passwords in test files

### Rate Limiting Issues

If hitting rate limits during development:

1. Wait 15 minutes for the limit to reset
2. Temporarily increase limits in `index.js`
3. Use different email addresses for testing

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Have I Been Pwned API](https://haveibeenpwned.com/API/v3)
- [bcrypt Documentation](https://www.npmjs.com/package/bcrypt)

---

**Last Updated**: October 19, 2025
**Version**: 1.0.0
**Maintained By**: ParkPal Backend Team
