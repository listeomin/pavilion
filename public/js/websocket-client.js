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

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.event === 'auth_ok') {
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
      this.isConnected = false;
      this.emit('disconnected', { code: event.code, reason: event.reason });

      // Auto-reconnect with exponential backoff
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * this.reconnectAttempts;
        setTimeout(() => this.connect(), delay);
      } else {
        // After max attempts, keep trying every 30 seconds indefinitely
        this.emit('max_reconnect_attempts');
        setTimeout(() => {
          this.reconnectAttempts = 0; // Reset counter for new cycle
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
