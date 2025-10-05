const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ParkPal API',
      version: '1.0.0',
      description: 'Smart Parking Management System API - A peer-to-peer parking space sharing platform with crowdsourced monitoring capabilities',
      contact: {
        name: 'ParkPal Team',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['user', 'host', 'admin'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Slot: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            description: { type: 'string' },
            address: { type: 'string' },
            latitude: { type: 'number', format: 'double' },
            longitude: { type: 'number', format: 'double' },
            price: { type: 'number', format: 'double' },
            availability: { type: 'boolean' },
            amenities: { type: 'object' },
            ownerId: { type: 'integer' },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            slotId: { type: 'integer' },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
            totalPrice: { type: 'number', format: 'double' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.js'], // Path to the API routes
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
