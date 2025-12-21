#!/bin/bash

# WebSocket сервер для Pavilion
# Использование: ./start.sh [dev|prod]

MODE=${1:-prod}

if [ "$MODE" = "dev" ]; then
  echo "Starting WS server in DEV mode (nodemon)..."
  cd /Users/ufoanima/Dev/personal/pavilion/ws-server
  npm run dev
else
  echo "Starting WS server in PROD mode..."
  cd /Users/ufoanima/Dev/personal/pavilion/ws-server
  npm start
fi
