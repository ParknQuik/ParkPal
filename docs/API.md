# ParkPal API Documentation

## Base URL
- **Development**: `http://localhost:3001/api`
- **Production**: `https://api.parkpal.com/api`

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

---

## Table of Contents

1. [Authentication](#authentication-endpoints)
2. [Parking Spots](#parking-spots)
3. [Bookings](#bookings)
4. [User Profile](#user-profile)
5. [Payments](#payments)
6. [Alerts](#alerts)
7. [Error Responses](#error-responses)
8. [Status Codes](#status-codes)

---

## Authentication Endpoints

### Register User

**POST** `/auth/signup`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "user"
}
```

**Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | User's full name |
| email | string | Yes | Valid email address |
| password | string | Yes | Minimum 8 characters |
| role | string | No | `user` or `host` (default: `user`) |

**Success Response (201):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "createdAt": "2024-10-04T10:30:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400` - Validation error (missing fields, invalid email)
- `409` - Email already exists

---

### Login

**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Success Response (200):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
- `400` - Missing credentials
- `401` - Invalid credentials

---

### Get Current User

**GET** `/auth/me`

Get authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "createdAt": "2024-10-04T10:30:00Z"
}
```

**Error Responses:**
- `401` - Invalid or expired token

---

### Logout

**POST** `/auth/logout`

Logout current user (invalidate token on client side).

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

## Parking Spots

### List Parking Spots

**GET** `/parking/spots`

Get list of all available parking spots with optional filters.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| latitude | number | No | User's latitude |
| longitude | number | No | User's longitude |
| radius | number | No | Search radius in km (default: 5) |
| minPrice | number | No | Minimum price filter |
| maxPrice | number | No | Maximum price filter |
| availability | string | No | `available` or `occupied` |

**Example Request:**
```
GET /parking/spots?latitude=40.7128&longitude=-74.0060&radius=10&maxPrice=50
```

**Success Response (200):**
```json
{
  "spots": [
    {
      "id": "slot-1",
      "title": "Downtown Parking",
      "description": "Covered parking near subway",
      "address": "123 Main St",
      "city": "New York",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "price": 25,
      "priceUnit": "hour",
      "availability": "available",
      "rating": 4.5,
      "reviews": 120,
      "amenities": ["Security", "Covered", "EV Charging"],
      "images": ["https://..."],
      "owner": {
        "id": 5,
        "name": "Jane Smith"
      }
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20
}
```

---

### Get Spot Details

**GET** `/parking/spots/:id`

Get detailed information about a specific parking spot.

**URL Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Parking spot ID |

**Success Response (200):**
```json
{
  "id": "slot-1",
  "title": "Downtown Parking",
  "description": "Covered parking near subway station. Available 24/7.",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "price": 25,
  "priceUnit": "hour",
  "availability": "available",
  "rating": 4.5,
  "reviews": 120,
  "amenities": ["Security", "Covered", "EV Charging", "Accessible"],
  "images": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "operatingHours": {
    "monday": "00:00-23:59",
    "tuesday": "00:00-23:59",
    "wednesday": "00:00-23:59",
    "thursday": "00:00-23:59",
    "friday": "00:00-23:59",
    "saturday": "00:00-23:59",
    "sunday": "00:00-23:59"
  },
  "owner": {
    "id": 5,
    "name": "Jane Smith",
    "rating": 4.8,
    "joinedDate": "2023-05-10"
  },
  "createdAt": "2024-01-15T08:00:00Z",
  "updatedAt": "2024-10-01T12:30:00Z"
}
```

**Error Responses:**
- `404` - Spot not found

---

### Create Parking Spot

**POST** `/parking/spots`

Create a new parking spot (host only).

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Downtown Parking",
  "description": "Covered parking near subway",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "price": 25,
  "priceUnit": "hour",
  "amenities": ["Security", "Covered", "EV Charging"],
  "images": ["https://..."]
}
```

**Success Response (201):**
```json
{
  "id": "slot-1",
  "title": "Downtown Parking",
  "message": "Parking spot created successfully"
}
```

**Error Responses:**
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not a host)
- `400` - Validation error

---

### Update Parking Spot

**PUT** `/parking/spots/:id`

Update parking spot details (owner only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "price": 30,
  "availability": "occupied",
  "description": "Updated description"
}
```

**Success Response (200):**
```json
{
  "message": "Spot updated successfully",
  "spot": {
    "id": "slot-1",
    "price": 30,
    "availability": "occupied"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Not the owner
- `404` - Spot not found

---

### Delete Parking Spot

**DELETE** `/parking/spots/:id`

Delete a parking spot (owner only).

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "message": "Parking spot deleted successfully"
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Not the owner
- `404` - Spot not found
- `409` - Cannot delete (active bookings exist)

---

### Search Parking Spots

**GET** `/parking/spots/search`

Search parking spots by query string.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| q | string | Search query (name, address, city) |
| page | number | Page number (default: 1) |
| limit | number | Results per page (default: 20) |

**Example Request:**
```
GET /parking/spots/search?q=downtown&page=1&limit=10
```

**Success Response (200):**
```json
{
  "results": [...],
  "total": 45,
  "page": 1,
  "totalPages": 5
}
```

---

## Bookings

### List User Bookings

**GET** `/bookings`

Get all bookings for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status: `pending`, `confirmed`, `cancelled`, `completed` |
| userId | string | User ID (for admin queries) |

**Success Response (200):**
```json
{
  "bookings": [
    {
      "id": "booking-1",
      "spotId": "slot-1",
      "spot": {
        "title": "Downtown Parking",
        "address": "123 Main St"
      },
      "startDate": "2024-10-05T09:00:00Z",
      "endDate": "2024-10-05T17:00:00Z",
      "status": "confirmed",
      "totalPrice": 200,
      "createdAt": "2024-10-01T10:00:00Z"
    }
  ],
  "total": 5
}
```

---

### Get Booking Details

**GET** `/bookings/:id`

Get details of a specific booking.

**Success Response (200):**
```json
{
  "id": "booking-1",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "spot": {
    "id": "slot-1",
    "title": "Downtown Parking",
    "address": "123 Main St",
    "price": 25
  },
  "startDate": "2024-10-05T09:00:00Z",
  "endDate": "2024-10-05T17:00:00Z",
  "duration": 8,
  "totalPrice": 200,
  "status": "confirmed",
  "paymentStatus": "completed",
  "createdAt": "2024-10-01T10:00:00Z"
}
```

---

### Create Booking

**POST** `/bookings`

Create a new parking reservation.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "spotId": "slot-1",
  "startDate": "2024-10-05T09:00:00Z",
  "endDate": "2024-10-05T17:00:00Z",
  "paymentMethodId": "pm_123456"
}
```

**Success Response (201):**
```json
{
  "booking": {
    "id": "booking-1",
    "spotId": "slot-1",
    "startDate": "2024-10-05T09:00:00Z",
    "endDate": "2024-10-05T17:00:00Z",
    "totalPrice": 200,
    "status": "pending"
  },
  "payment": {
    "id": "payment-1",
    "status": "processing"
  }
}
```

**Error Responses:**
- `400` - Invalid dates or spot unavailable
- `401` - Unauthorized
- `404` - Spot not found
- `409` - Booking conflict (slot already booked)

---

### Cancel Booking

**PATCH** `/bookings/:id/cancel`

Cancel an existing booking.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "message": "Booking cancelled successfully",
  "booking": {
    "id": "booking-1",
    "status": "cancelled"
  },
  "refund": {
    "amount": 200,
    "status": "processing"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `403` - Cannot cancel (too late)
- `404` - Booking not found

---

## User Profile

### Get User Profile

**GET** `/users/profile`

Get authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "role": "user",
  "avatar": "https://...",
  "verified": true,
  "stats": {
    "totalBookings": 15,
    "totalSpent": 1500,
    "memberSince": "2024-01-01"
  }
}
```

---

### Update Profile

**PATCH** `/users/profile`

Update user profile information.

**Request Body:**
```json
{
  "name": "John Smith",
  "phone": "+1234567890",
  "avatar": "https://..."
}
```

**Success Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "name": "John Smith",
    "phone": "+1234567890"
  }
}
```

---

### List Payment Methods

**GET** `/users/payment-methods`

Get user's saved payment methods.

**Success Response (200):**
```json
{
  "paymentMethods": [
    {
      "id": "pm_123",
      "type": "card",
      "last4": "4242",
      "brand": "visa",
      "expiryMonth": 12,
      "expiryYear": 2025,
      "isDefault": true
    }
  ]
}
```

---

### Add Payment Method

**POST** `/users/payment-methods`

Add a new payment method.

**Request Body:**
```json
{
  "type": "card",
  "token": "tok_visa",
  "isDefault": false
}
```

**Success Response (201):**
```json
{
  "message": "Payment method added",
  "paymentMethod": {
    "id": "pm_124",
    "last4": "1234"
  }
}
```

---

### Delete Payment Method

**DELETE** `/users/payment-methods/:id`

Remove a payment method.

**Success Response (200):**
```json
{
  "message": "Payment method removed"
}
```

---

## Payments

### Process Payment

**POST** `/payments/process`

Process a payment for a booking.

**Request Body:**
```json
{
  "bookingId": "booking-1",
  "paymentMethodId": "pm_123",
  "amount": 200
}
```

**Success Response (200):**
```json
{
  "payment": {
    "id": "payment-1",
    "amount": 200,
    "status": "completed",
    "transactionId": "txn_abc123"
  }
}
```

---

### Get Payment History

**GET** `/payments/history`

Get user's payment history.

**Success Response (200):**
```json
{
  "payments": [
    {
      "id": "payment-1",
      "bookingId": "booking-1",
      "amount": 200,
      "status": "completed",
      "createdAt": "2024-10-01T12:00:00Z"
    }
  ]
}
```

---

## Alerts

### Get User Alerts

**GET** `/alerts`

Get notifications for the authenticated user.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| unreadOnly | boolean | Show only unread alerts |

**Success Response (200):**
```json
{
  "alerts": [
    {
      "id": "alert-1",
      "type": "booking_confirmed",
      "message": "Your booking has been confirmed",
      "read": false,
      "createdAt": "2024-10-04T10:00:00Z"
    }
  ],
  "unreadCount": 3
}
```

---

### Mark Alert as Read

**PATCH** `/alerts/:id/read`

Mark a notification as read.

**Success Response (200):**
```json
{
  "message": "Alert marked as read"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate email) |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource conflict |
| 500 | Internal Server Error |

---

## Rate Limiting

- **Rate Limit**: 100 requests per minute per IP
- **Headers**:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1696428000
  ```

When rate limit is exceeded:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  }
}
```

---

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Webhooks

Configure webhooks to receive real-time notifications:

**Events:**
- `booking.created`
- `booking.confirmed`
- `booking.cancelled`
- `payment.completed`
- `payment.failed`

**Webhook Payload:**
```json
{
  "event": "booking.confirmed",
  "timestamp": "2024-10-04T10:00:00Z",
  "data": {
    "bookingId": "booking-1",
    "userId": 1,
    "spotId": "slot-1"
  }
}
```

---

## Testing

### Test Credentials
```json
{
  "user": {
    "email": "test@parkpal.com",
    "password": "TestPass123!"
  },
  "host": {
    "email": "host@parkpal.com",
    "password": "HostPass123!"
  }
}
```

### Test Cards (Stripe)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
