const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const PORT = 3001;
const clients = new Map(); // sessionId -> WebSocket

const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const params = url.parse(req.url, true).query;
  const sessionId = params.session_id;

  if (!sessionId) {
    console.error('[WS] Connection rejected: no session_id');
    ws.close(1008, 'session_id required');
    return;
  }

  clients.set(sessionId, ws);
  console.log(`[WS] Client connected: ${sessionId} (total: ${clients.size})`);
  
  // Send auth confirmation
  ws.send(JSON.stringify({ 
    event: 'auth_ok', 
    data: { session_id: sessionId, name: 'user' } 
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`[WS] Message from ${sessionId}:`, message.type);
      
      // Echo back для подтверждения
      ws.send(JSON.stringify({ type: 'ack', ...message }));
    } catch (e) {
      console.error('[WS] Parse error:', e.message);
    }
  });

  ws.on('close', () => {
    clients.delete(sessionId);
    console.log(`[WS] Client disconnected: ${sessionId} (total: ${clients.size})`);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Error for ${sessionId}:`, err.message);
  });
});

// Broadcast функция
function broadcast(message) {
  const payload = JSON.stringify(message);
  let sent = 0;

  clients.forEach((ws, sessionId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
      sent++;
    }
  });

  console.log(`[WS] Broadcasted to ${sent}/${clients.size} clients`);
  return sent;
}

// HTTP endpoint для PHP (broadcast trigger)
server.on('request', (req, res) => {
  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const message = JSON.parse(body);
        const sent = broadcast(message);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, sent }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(PORT, () => {
  console.log(`[WS] Server listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[WS] SIGTERM received, closing...');
  wss.close(() => {
    server.close(() => {
      console.log('[WS] Server closed');
      process.exit(0);
    });
  });
});
