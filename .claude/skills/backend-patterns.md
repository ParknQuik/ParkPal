# Backend Patterns

**Domain Knowledge:** API, database, and caching patterns for Node.js + Express + Prisma

## Controller Pattern

```javascript
// ✅ Clean controller - Delegates to service layer
exports.createBooking = async (req, res) => {
  try {
    const bookingData = req.body;
    const userId = req.user.id;

    const booking = await bookingService.create(bookingData, userId);

    res.status(201).json({
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof ConflictError) {
      return res.status(409).json({ error: error.message });
    }
    logger.error('Failed to create booking', { error, userId: req.user.id });
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

## Service Layer Pattern

```javascript
// services/bookingService.js
const bookingService = {
  async create(bookingData, userId) {
    // 1. Validate
    const validatedData = bookingSchema.parse(bookingData);

    // 2. Check availability
    const isAvailable = await this.checkAvailability(
      validatedData.slotId,
      validatedData.startTime,
      validatedData.endTime
    );

    if (!isAvailable) {
      throw new ConflictError('Slot is not available for selected time');
    }

    // 3. Calculate price
    const price = await pricingService.calculate(validatedData);

    // 4. Create booking
    const booking = await prisma.booking.create({
      data: {
        ...validatedData,
        driverId: userId,
        totalPrice: price.total,
        status: 'pending'
      },
      include: {
        slot: true,
        driver: true
      }
    });

    // 5. Send notification
    await notificationService.sendBookingConfirmation(booking);

    return booking;
  },

  async checkAvailability(slotId, startTime, endTime) {
    const conflictingBookings = await prisma.booking.count({
      where: {
        slotId,
        status: { in: ['confirmed', 'active'] },
        OR: [
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime }
          },
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime }
          },
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime }
          }
        ]
      }
    });

    return conflictingBookings === 0;
  }
};

module.exports = bookingService;
```

## Repository Pattern (with Prisma)

```javascript
// repositories/userRepository.js
class UserRepository {
  async findById(id, include = {}) {
    return prisma.user.findUnique({
      where: { id },
      include
    });
  }

  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email }
    });
  }

  async create(userData) {
    return prisma.user.create({
      data: userData
    });
  }

  async update(id, data) {
    return prisma.user.update({
      where: { id },
      data
    });
  }

  async delete(id) {
    return prisma.user.delete({
      where: { id }
    });
  }

  async findMany(filters = {}, pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: filters,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where: filters })
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = new UserRepository();
```

## Middleware Patterns

### Authentication Middleware

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

exports.requireAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
```

### Validation Middleware

```javascript
// middleware/validate.js
const Joi = require('joi');

exports.validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    req.validatedData = value;
    next();
  };
};
```

## Caching Patterns

### Redis Caching

```javascript
// services/cache.js
const redis = require('../config/redis');

class CacheService {
  async get(key) {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error('Cache get error', { key, error });
      return null;
    }
  }

  async set(key, value, ttlSeconds = 3600) {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set error', { key, error });
    }
  }

  async del(key) {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Cache delete error', { key, error });
    }
  }

  async invalidatePattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error('Cache invalidate error', { pattern, error });
    }
  }
}

module.exports = new CacheService();
```

### Cache-Aside Pattern

```javascript
// services/parkingService.js
const cacheService = require('./cache');

exports.getNearbySlots = async (lat, lon, radius) => {
  const cacheKey = `slots:${lat}:${lon}:${radius}`;

  // Try cache first
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from database
  const slots = await prisma.parkingSlot.findMany({
    where: {
      lat: { gte: lat - radius, lte: lat + radius },
      lon: { gte: lon - radius, lte: lon + radius },
      status: 'available'
    }
  });

  // Store in cache (5 minutes TTL)
  await cacheService.set(cacheKey, slots, 300);

  return slots;
};
```

## Error Handling Pattern

```javascript
// utils/errors.js
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field) {
    super(message, 400);
    this.field = field;
  }
}

class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} not found`, 404);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

// Global error handler middleware
exports.errorHandler = (err, req, res, next) => {
  const { statusCode = 500, message } = err;

  // Log error
  logger.error('Request error', {
    error: message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id
  });

  // Don't leak error details in production
  const response = {
    error: err.isOperational ? message : 'Internal server error'
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
```

## Database Transaction Pattern

```javascript
// services/paymentService.js
exports.processPayment = async (bookingId, paymentData) => {
  // Use Prisma transaction for atomic operations
  return await prisma.$transaction(async (tx) => {
    // 1. Update booking
    const booking = await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'confirmed' }
    });

    // 2. Create payment record
    const payment = await tx.payment.create({
      data: {
        bookingId,
        amount: booking.totalPrice,
        method: paymentData.method,
        status: 'completed'
      }
    });

    // 3. Update host earnings
    await tx.user.update({
      where: { id: booking.slot.ownerId },
      data: {
        earnings: { increment: booking.totalPrice }
      }
    });

    return { booking, payment };
  });
};
```

## API Response Patterns

```javascript
// utils/response.js
exports.success = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

exports.error = (res, message, statusCode = 500, details = null) => {
  const response = {
    success: false,
    error: message
  };

  if (details) {
    response.details = details;
  }

  res.status(statusCode).json(response);
};

exports.paginated = (res, data, pagination) => {
  res.status(200).json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages
    }
  });
};
```

## Related Files
- **coding-standards.md**: General coding standards
- **frontend-patterns.md**: Frontend patterns
