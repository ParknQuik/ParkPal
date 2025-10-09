const express = require('express');
const cors = require('cors');
const http = require('http');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
require('dotenv').config();

const secretManager = require('./config/secretManager');

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;

// Initialize Secret Manager
secretManager.initialize();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Routes
const authRoutes = require('./routes/auth');
const parkingRoutes = require('./routes/parking');
const paymentRoutes = require('./routes/payments');
const alertRoutes = require('./routes/alerts');
const marketplaceRoutes = require('./routes/marketplace');
const configRoutes = require('./routes/config');

authRoutes(app);
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

server.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
