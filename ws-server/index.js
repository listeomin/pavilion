const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Config
const WS_PORT = 3001;
const HTTP_PORT = 3002;
const DB_PATH = path.join(__dirname, '../chat.sqlite');

// Init
const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('[DB] Connection error:', err.message);
    process.exit(1);
  }
  console.log(`[DB] Connected to ${DB_PATH}`);
});

const wss = new WebSocket.Server({ port: WS_PORT });

// Heartbeat interval
const HEARTBEAT_INTERVAL = 30000;

// Store connections: Map<WebSocket, { sessionId, rooms, isAlive }>
const connections = new Map();

// Validate session
function validateSession(sessionId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, name FROM sessions WHERE id = ?', [sessionId], (err, row) => {
      if (err) {
        console.error('[DB] Validation error:', err.message);
        reject(err);
      } else {
        resolve(row || null);
      }
    });
  });
}

// Broadcast to room
function broadcast(roomId, event, data) {
  const message = JSON.stringify({ event, data });
  let sent = 0;
  
  connections.forEach((meta, ws) => {
    if (ws.readyState === WebSocket.OPEN && meta.rooms.includes(roomId)) {
      ws.send(message);
      sent++;
    }
  });
  
  console.log(`[Broadcast] ${event} to room:${roomId} → ${sent} clients`);
}

// WebSocket connection
wss.on('connection', async (ws, req) => {
  console.log('[WS] New connection');
  
  // Extract session_id from query string
  const url = new URL(req.url, `ws://localhost:${WS_PORT}`);
  const sessionId = url.searchParams.get('session_id');
  
  if (!sessionId) {
    console.log('[WS] Rejected: missing session_id');
    ws.close(4001, 'Missing session_id');
    return;
  }
  
  // Validate session
  let session;
  try {
    session = await validateSession(sessionId);
  } catch (err) {
    console.log('[WS] DB error during validation');
    ws.close(4000, 'Internal error');
    return;
  }
  
  if (!session) {
    console.log('[WS] Rejected: invalid session_id');
    ws.close(4002, 'Invalid session');
    return;
  }
  
  // Store connection metadata
  connections.set(ws, {
    sessionId: session.id,
    name: session.name,
    rooms: ['public'], // currently only public room
    isAlive: true
  });
  
  console.log(`[WS] Authenticated: ${session.name} (${session.id.substring(0, 8)}...)`);
  
  // Send auth confirmation
  ws.send(JSON.stringify({
    event: 'auth_ok',
    data: { sessionId: session.id, name: session.name }
  }));
  
  // Heartbeat
  ws.on('pong', () => {
    const meta = connections.get(ws);
    if (meta) meta.isAlive = true;
  });
  
  // Handle messages (future: subscribe to rooms, etc.)
  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      console.log('[WS] Message from client:', data);
      
      // Handle different message types here
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ event: 'pong' }));
      }
    } catch (err) {
      console.error('[WS] Invalid message:', err.message);
    }
  });
  
  // Handle disconnect
  ws.on('close', () => {
    const meta = connections.get(ws);
    if (meta) {
      console.log(`[WS] Disconnected: ${meta.name}`);
      connections.delete(ws);
    }
  });
  
  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
  });
});

// Heartbeat check
setInterval(() => {
  connections.forEach((meta, ws) => {
    if (!meta.isAlive) {
      console.log(`[Heartbeat] Terminating dead connection: ${meta.name}`);
      ws.terminate();
      connections.delete(ws);
      return;
    }
    
    meta.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

// HTTP API for api.php to trigger broadcasts
app.post('/broadcast', (req, res) => {
  const { event, data, room = 'public' } = req.body;
  
  if (!event || !data) {
    return res.status(400).json({ error: 'Missing event or data' });
  }
  
  console.log(`[HTTP] Broadcast request: ${event} to room:${room}`);
  broadcast(room, event, data);
  
  res.json({ ok: true, clients: connections.size });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connections: connections.size,
    uptime: process.uptime()
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Shutdown] Closing database...');
  db.close((err) => {
    if (err) console.error(err.message);
    process.exit(0);
  });
});

// Start servers
app.listen(HTTP_PORT, () => {
  console.log(`[HTTP] Listening on port ${HTTP_PORT}`);
});

console.log(`[WS] Listening on port ${WS_PORT}`);
console.log('[Ready] WebSocket server started');
