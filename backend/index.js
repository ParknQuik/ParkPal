const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/auth');
const parkingRoutes = require('./routes/parking');
const paymentRoutes = require('./routes/payments');
const alertRoutes = require('./routes/alerts');

authRoutes(app);
parkingRoutes(app);
paymentRoutes(app);
alertRoutes(app);

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
