# Coding Standards

**Domain Knowledge:** Language best practices and project conventions

## JavaScript/TypeScript Standards

### Naming Conventions

```javascript
// Variables and functions: camelCase
const userName = 'John';
function getUserData() {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.parkpal.com';

// Classes and Components: PascalCase
class UserService {}
function BookingCard() {}

// Private fields: _prefix (convention)
class Service {
  _privateMethod() {}
}

// Boolean variables: is/has/should prefix
const isActive = true;
const hasPermission = false;
const shouldValidate = true;
```

### Code Style

```javascript
// ✅ Use const by default, let when reassignment needed
const config = {};
let counter = 0;

// ❌ Never use var
var oldStyle = 'bad';

// ✅ Destructuring
const { name, email } = user;
const [first, second] = items;

// ✅ Template literals
const greeting = `Hello, ${name}!`;

// ✅ Arrow functions for callbacks
items.map(item => item.name);
items.filter(item => item.active);

// ✅ Async/await over promises
async function fetchUser() {
  const user = await prisma.user.findUnique({ where: { id } });
  return user;
}

// ❌ Don't use .then() chains
function fetchUserOld() {
  return prisma.user.findUnique({ where: { id } })
    .then(user => user);
}
```

### Error Handling

```javascript
// ✅ Try-catch for async operations
async function getUserData(userId) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  } catch (error) {
    logger.error('Failed to fetch user', { userId, error: error.message });
    throw error; // Re-throw or handle appropriately
  }
}

// ✅ Custom error classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.statusCode = 400;
  }
}

// ✅ Error responses
res.status(400).json({
  error: 'Validation failed',
  details: validationErrors
});
```

### Comments

```javascript
// ✅ GOOD: Explain WHY, not WHAT
// We use a 1-hour expiry because PayMongo tokens expire after 60 minutes
const TOKEN_EXPIRY = 3600;

// Using bcrypt cost factor of 12 for balance between security and performance
// Tested on production hardware: ~250ms per hash
const BCRYPT_ROUNDS = 12;

// ❌ BAD: Explain WHAT (code already shows this)
// Set token expiry to 3600 seconds
const TOKEN_EXPIRY = 3600;

// Create a new user
const user = await prisma.user.create({ data });
```

### JSDoc for Public APIs

```javascript
/**
 * Create a new booking for a parking slot
 * @param {Object} bookingData - Booking details
 * @param {string} bookingData.slotId - Parking slot ID
 * @param {string} bookingData.driverId - Driver user ID
 * @param {Date} bookingData.startTime - Booking start time
 * @param {Date} bookingData.endTime - Booking end time
 * @returns {Promise<Booking>} Created booking object
 * @throws {ValidationError} If booking data is invalid
 * @throws {ConflictError} If slot is already booked
 */
async function createBooking(bookingData) {
  // Implementation
}
```

## React/React Native Standards

### Component Structure

```typescript
// ✅ Functional components with hooks
import React, { useState, useEffect } from 'react';

interface Props {
  userId: string;
  onSuccess?: () => void;
}

const UserProfile: React.FC<Props> = ({ userId, onSuccess }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      const data = await userService.getUser(userId);
      setUser(data);
    } catch (error) {
      console.error('Failed to fetch user', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!user) return <ErrorMessage />;

  return (
    <View>
      <Text>{user.name}</Text>
    </View>
  );
};

export default UserProfile;
```

### Hooks Best Practices

```typescript
// ✅ Custom hooks for reusable logic
function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await userService.getUser(userId);
      setUser(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { user, loading, error, refetch: fetchUser };
}

// Usage
const { user, loading, error, refetch } = useUser(userId);
```

## File Organization

```
backend/
  controllers/       # Request handlers
  services/          # Business logic
  middleware/        # Express middleware
  routes/            # Route definitions
  validators/        # Input validation schemas
  utils/             # Utility functions
  config/            # Configuration
  tests/             # Test files

frontend/mobile/
  src/
    components/      # Reusable components
    screens/         # Screen components
    navigation/      # Navigation config
    redux/           # Redux slices
    services/        # API services
    utils/           # Utility functions
    types/           # TypeScript types
    __tests__/       # Test files
```

## Import Order

```typescript
// 1. External libraries
import React from 'react';
import { View, Text } from 'react-native';
import { useDispatch } from 'react-redux';

// 2. Internal modules (absolute imports)
import { Button } from '@/components/Button';
import { useAuth } from '@/hooks/useAuth';
import { User } from '@/types';

// 3. Relative imports
import { styles } from './styles';
import { helper } from '../utils/helper';
```

## Code Formatting

- **Indentation**: 2 spaces
- **Line length**: 100 characters max
- **Semicolons**: Required
- **Quotes**: Single quotes for strings, double for JSX
- **Trailing commas**: Always (multiline)

```javascript
// ✅ GOOD
const user = {
  name: 'John',
  email: 'john@example.com',
};

// ❌ BAD: No trailing comma
const user = {
  name: 'John',
  email: 'john@example.com'
};
```

## Related Files
- **CODE_GUIDELINES.md**: Complete project guidelines
- **backend-patterns.md**: Backend-specific patterns
- **frontend-patterns.md**: Frontend-specific patterns
