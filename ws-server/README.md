# WebSocket Server Setup

## Install dependencies
```bash
cd ws-server
npm install
```

## Local development
```bash
# Terminal 1: WS server
cd ws-server
npm run dev

# Terminal 2: Test connection
npm install -g wscat
wscat -c "ws://localhost:3001?session_id=YOUR_SESSION_ID"
```

## Production deploy
```bash
# Install PM2 globally
npm install -g pm2

# Start all services
pm2 start ecosystem.config.js

# View logs
pm2 logs pavilion-ws

# Restart
pm2 restart pavilion-ws

# Stop
pm2 stop pavilion-ws
```

## Nginx config
Add to your nginx site config:

```nginx
# WebSocket proxy
location /ws {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 86400;
}

# HTTP broadcast endpoint (internal only)
location /ws-broadcast {
    proxy_pass http://localhost:3002/broadcast;
    allow 127.0.0.1;
    deny all;
}
```

## Test broadcast from api.php
```php
// After MessageRepository::add()
file_get_contents('http://localhost:3002/broadcast', false, 
    stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode([
                'event' => 'message_new',
                'data' => $message,
                'room' => 'public'
            ])
        ]
    ])
);
```

## Health check
```bash
curl http://localhost:3002/health
```

## Ports
- WebSocket: 3001
- HTTP API: 3002
