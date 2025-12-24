// public/js/websocket-client.js

export class WebSocketClient {
  constructor(url, sessionId) {
    this.url = url;
    this.sessionId = sessionId;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.isConnected = false;
  }

  connect() {
    const wsUrl = `${this.url}?session_id=${this.sessionId}`;
    console.log('[WS] Connecting to', wsUrl);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WS] Message:', data);
        
        if (data.event === 'auth_ok') {
          console.log('[WS] Authenticated:', data.data.name);
          this.emit('auth_ok', data.data);
        } else {
          this.emit(data.event, data.data);
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WS] Error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = (event) => {
      console.log('[WS] Disconnected:', event.code, event.reason);
      this.isConnected = false;
      this.emit('disconnected', { code: event.code, reason: event.reason });
      
      // Auto-reconnect with exponential backoff
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        setTimeout(() => this.connect(), delay);
      } else {
        // After max attempts, keep trying every 30 seconds indefinitely
        console.error('[WS] Max reconnect attempts reached, will retry every 30s');
        this.emit('max_reconnect_attempts');
        setTimeout(() => {
          this.reconnectAttempts = 0; // Reset counter for new cycle
          console.log('[WS] Retrying connection...');
          this.connect();
        }, 30000);
      }
    };
  }

  disconnect() {
    if (this.ws) {
      this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
      this.ws.close();
    }
  }

  reconnectWithNewSession(newSessionId) {
    this.sessionId = newSessionId;
    this.reconnectAttempts = 0;
    
    if (this.ws) {
      // Prevent auto-reconnect on close
      const oldMaxAttempts = this.maxReconnectAttempts;
      this.maxReconnectAttempts = 0;
      this.ws.close();
      this.maxReconnectAttempts = oldMaxAttempts;
    }
    
    this.connect();
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WS] Cannot send, not connected');
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`[WS] Listener error for ${event}:`, err);
      }
    });
  }
}
