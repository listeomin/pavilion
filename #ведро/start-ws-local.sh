#!/bin/bash
# Local Development - Start WebSocket Server

echo "Starting WebSocket Server..."
cd "$(dirname "$0")/ws-server"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start server
echo "Server starting on:"
echo "  WebSocket: ws://localhost:3001"
echo "  HTTP API:  http://localhost:3002"
echo ""
echo "Press Ctrl+C to stop"
echo ""

node index.js
