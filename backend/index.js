const express = require('express');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
require('dotenv').config();

const secretManager = require('./config/secretManager');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;

// Initialize Secret Manager
secretManager.initialize();

// Rate limiting configuration
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: { error: 'Too many authentication attempts, please try again later.' },
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
// Security headers with helmet.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // For Swagger UI
      scriptSrc: ["'self'", "'unsafe-inline'"], // For Swagger UI
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  crossOriginEmbedderPolicy: false, // Allow Swagger UI to work
}));

// Configure CORS properly
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [
        'https://parkpal.com',
        'https://www.parkpal.com',
        // Add production domains here
      ]
    : [
        'http://localhost:3000',
        'http://localhost:5173', // Vite dev server
        'http://localhost:5174', // Vite dev server (alternate port)
        'http://localhost:19006', // Expo web
        'http://192.168.100.233:3000',
        'http://192.168.100.233:19006',
        'http://192.168.100.241:5173', // Vite dev server on network
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d{4,5}$/, // Allow all local network IPs
      ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ParkPal API Documentation',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Apply global rate limiter to all API routes
app.use('/api/', globalLimiter);

// Routes
const authRoutes = require('./routes/auth');
const parkingRoutes = require('./routes/parking');
const paymentRoutes = require('./routes/payments');
const alertRoutes = require('./routes/alerts');
const marketplaceRoutes = require('./routes/marketplace');
const configRoutes = require('./routes/config');

// Auth routes get stricter rate limiting
authRoutes(app, authLimiter);
parkingRoutes(app);
paymentRoutes(app);
alertRoutes(app);
marketplaceRoutes(app);
configRoutes(app);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'ParkPal API is running', status: 'healthy' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// WebSocket setup
const websocketService = require('./services/websocket');
websocketService.init(server);

server.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening at http://localhost:${port}`);
  console.log(`Network access: http://192.168.100.233:${port}`);
});
