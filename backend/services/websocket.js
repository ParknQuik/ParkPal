const WebSocket = require('ws');
let wss;
function setupWebSocket(server) {
  wss = new WebSocket.Server({ server });
  wss.on('connection', ws => {
    ws.send(JSON.stringify({ message: 'Connected to ParkPal WebSocket' }));
  });
}
function broadcast(data) {
  if (!wss) return;
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}
module.exports = { setupWebSocket, broadcast };
