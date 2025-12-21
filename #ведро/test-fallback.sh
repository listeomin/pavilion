#!/bin/bash
# Test WebSocket Fallback Mode

echo "=== Testing WebSocket Fallback ==="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cd "$(dirname "$0")"

echo "1. Starting WebSocket server..."
./start-ws-local.sh &
WS_PID=$!
sleep 2

# Check if WS is running
curl -s http://localhost:3002/health > /dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ WebSocket server started${NC}"
else
    echo -e "${RED}✗ Failed to start WebSocket server${NC}"
    kill $WS_PID 2>/dev/null
    exit 1
fi

echo ""
echo "2. Open browser to test:"
echo -e "${YELLOW}   http://localhost:8080/pavilion/${NC}"
echo ""
echo "3. Open DevTools Console and check for:"
echo "   [WS] Connected"
echo "   [WS] Authenticated: ..."
echo ""
echo "4. Press Enter when ready to test fallback..."
read

echo ""
echo "5. Stopping WebSocket server to trigger fallback..."
kill $WS_PID
sleep 1
echo -e "${YELLOW}✓ WebSocket server stopped${NC}"
echo ""
echo "6. Check browser console for:"
echo "   [WS] Disconnected"
echo "   [WS] Max reconnect attempts reached, falling back to polling"
echo "   [Main] Starting HTTP polling (fallback mode)"
echo ""
echo "7. Send a message in the chat"
echo "   → Should appear after ~3 seconds (via polling)"
echo ""
echo "8. Press Enter to restart WebSocket server..."
read

echo ""
echo "9. Restarting WebSocket server..."
./start-ws-local.sh &
WS_PID=$!
sleep 2

echo -e "${GREEN}✓ WebSocket server restarted${NC}"
echo ""
echo "10. Within 30 seconds, check console for:"
echo "    [WS] Retrying connection..."
echo "    [WS] Connected"
echo "    [Main] Stopped polling, WS connected"
echo ""
echo "Press Ctrl+C to cleanup..."

# Wait for user interrupt
trap "kill $WS_PID 2>/dev/null; exit 0" INT
wait $WS_PID
