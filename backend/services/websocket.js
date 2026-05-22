const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const url = require('url');
const secretManager = require('../config/secretManager');

let wss;
let jwtSecretCache = null;

async function getJwtSecret() {
  if (jwtSecretCache) {
    return jwtSecretCache;
  }

  const secret = await secretManager.getSecret('jwt-secret');

  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  jwtSecretCache = secret;
  return secret;
}

function init(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', async (ws, req) => {
    // Extract token from query parameter
    const queryParams = url.parse(req.url, true).query;
    const token = queryParams.token;

    // Verify JWT token
    if (!token) {
      ws.close(4001, 'Authentication token required');
      console.log('WebSocket connection rejected: No token provided');
      return;
    }

    try {
      const jwtSecret = await getJwtSecret();
      const decoded = jwt.verify(token, jwtSecret);

      // Attach user info to WebSocket connection
      ws.userId = decoded.id;
      ws.userEmail = decoded.email;
      ws.userRole = decoded.role;
      ws.isAuthenticated = true;

      console.log(`WebSocket authenticated: User ${decoded.id} (${decoded.email}, ${decoded.role})`);

      // Send authentication success message
      ws.send(JSON.stringify({
        type: 'authenticated',
        message: 'Connected to ParknQuik WebSocket',
        userId: decoded.id,
        role: decoded.role
      }));

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log(`Received from user ${ws.userId}:`, data);

          // Handle different message types
          handleMessage(ws, data);
        } catch (err) {
          console.error('Invalid message format:', err);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        console.log(`WebSocket closed: User ${ws.userId}`);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for user ${ws.userId}:`, error.message);
      });

    } catch (err) {
      ws.close(4001, 'Invalid or expired token');
      console.log('WebSocket connection rejected: Invalid token -', err.message);
      return;
    }
  });
}

/**
 * Handle incoming WebSocket messages
 */
function handleMessage(ws, data) {
  switch (data.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;

    case 'subscribe':
      // Allow users to subscribe to specific channels
      if (data.channel) {
        ws.subscribedChannels = ws.subscribedChannels || [];
        if (!ws.subscribedChannels.includes(data.channel)) {
          ws.subscribedChannels.push(data.channel);
          ws.send(JSON.stringify({
            type: 'subscribed',
            channel: data.channel
          }));
        }
      }
      break;

    case 'unsubscribe':
      if (data.channel && ws.subscribedChannels) {
        ws.subscribedChannels = ws.subscribedChannels.filter(ch => ch !== data.channel);
        ws.send(JSON.stringify({
          type: 'unsubscribed',
          channel: data.channel
        }));
      }
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Unknown message type'
      }));
  }
}

/**
 * Broadcast message to all connected clients
 * @param {Object} data - Message data
 * @param {Object} options - Broadcast options
 * @param {string} options.channel - Only send to clients subscribed to this channel
 * @param {number} options.userId - Only send to specific user
 * @param {string} options.role - Only send to users with this role
 * @param {number[]} options.excludeUserIds - Exclude these user IDs
 */
function broadcast(data, options = {}) {
  if (!wss) return;

  const message = JSON.stringify(data);
  let sentCount = 0;

  wss.clients.forEach((client) => {
    // Check if client is authenticated and connection is open
    if (client.readyState !== WebSocket.OPEN || !client.isAuthenticated) {
      return;
    }

    // Apply filters based on options
    if (options.userId && client.userId !== options.userId) {
      return;
    }

    if (options.role && client.userRole !== options.role) {
      return;
    }

    if (options.excludeUserIds && options.excludeUserIds.includes(client.userId)) {
      return;
    }

    if (options.channel) {
      if (!client.subscribedChannels || !client.subscribedChannels.includes(options.channel)) {
        return;
      }
    }

    // Send message
    try {
      client.send(message);
      sentCount++;
    } catch (err) {
      console.error(`Failed to send message to user ${client.userId}:`, err.message);
    }
  });

  console.log(`Broadcast sent to ${sentCount} client(s)${options.channel ? ` (channel: ${options.channel})` : ''}`);
}

/**
 * Send message to specific user
 */
function sendToUser(userId, data) {
  broadcast(data, { userId });
}

/**
 * Send message to all users with specific role
 */
function sendToRole(role, data) {
  broadcast(data, { role });
}

/**
 * Get count of connected clients
 */
function getConnectionCount() {
  if (!wss) return 0;
  return Array.from(wss.clients).filter(client => client.isAuthenticated).length;
}

/**
 * Get list of connected user IDs
 */
function getConnectedUsers() {
  if (!wss) return [];
  return Array.from(wss.clients)
    .filter(client => client.isAuthenticated)
    .map(client => ({
      userId: client.userId,
      email: client.userEmail,
      role: client.userRole,
      channels: client.subscribedChannels || []
    }));
}

module.exports = {
  init,
  broadcast,
  sendToUser,
  sendToRole,
  getConnectionCount,
  getConnectedUsers
};
