// public/js/__tests__/websocket-rebase.test.js

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSocketClient } from '../websocket-client.js';

describe('WebSocketClient - Rebase Event', () => {
  let mockWs;
  let wsClient;
  const TEST_URL = 'ws://localhost:3001';
  const TEST_SESSION = 'test-session-123';

  beforeEach(() => {
    // Mock WebSocket
    mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1, // OPEN
      OPEN: 1
    };

    global.WebSocket = vi.fn(() => mockWs);

    wsClient = new WebSocketClient(TEST_URL, TEST_SESSION);
  });

  describe('Rebase event handling', () => {
    it('emits rebase event when received', () => {
      const rebaseHandler = vi.fn();
      wsClient.on('rebase', rebaseHandler);

      wsClient.connect();

      // Trigger onopen
      mockWs.onopen();

      // Simulate rebase message
      const rebaseMessage = JSON.stringify({
        event: 'rebase',
        data: {
          messages: [
            { id: 1, text: 'Seed 1' },
            { id: 2, text: 'Seed 2' }
          ]
        }
      });

      mockWs.onmessage({ data: rebaseMessage });

      expect(rebaseHandler).toHaveBeenCalledWith({
        messages: [
          { id: 1, text: 'Seed 1' },
          { id: 2, text: 'Seed 2' }
        ]
      });
    });

    it('handles empty messages array in rebase', () => {
      const rebaseHandler = vi.fn();
      wsClient.on('rebase', rebaseHandler);

      wsClient.connect();
      mockWs.onopen();

      const rebaseMessage = JSON.stringify({
        event: 'rebase',
        data: { messages: [] }
      });

      mockWs.onmessage({ data: rebaseMessage });

      expect(rebaseHandler).toHaveBeenCalledWith({ messages: [] });
    });

    it('multiple listeners receive rebase event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      wsClient.on('rebase', handler1);
      wsClient.on('rebase', handler2);

      wsClient.connect();
      mockWs.onopen();

      const rebaseMessage = JSON.stringify({
        event: 'rebase',
        data: { messages: [] }
      });

      mockWs.onmessage({ data: rebaseMessage });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Connection state after rebase', () => {
    it('stays connected after rebase event', () => {
      wsClient.connect();
      mockWs.onopen();

      expect(wsClient.isConnected).toBe(true);

      const rebaseMessage = JSON.stringify({
        event: 'rebase',
        data: { messages: [] }
      });

      mockWs.onmessage({ data: rebaseMessage });

      expect(wsClient.isConnected).toBe(true);
    });

    it('can send messages after rebase', () => {
      wsClient.connect();
      mockWs.onopen();

      const rebaseMessage = JSON.stringify({
        event: 'rebase',
        data: { messages: [] }
      });

      mockWs.onmessage({ data: rebaseMessage });

      wsClient.send({ type: 'test', data: 'hello' });

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'test', data: 'hello' })
      );
    });
  });

  describe('Session ID handling', () => {
    it('includes session_id in connection URL', () => {
      wsClient.connect();

      const expectedUrl = `${TEST_URL}?session_id=${TEST_SESSION}`;
      expect(global.WebSocket).toHaveBeenCalledWith(expectedUrl);
    });

    it('can reconnect with new session_id', () => {
      wsClient.connect();
      expect(global.WebSocket).toHaveBeenCalledWith(
        `${TEST_URL}?session_id=${TEST_SESSION}`
      );

      // Simulate session change
      const newSessionId = 'new-session-456';
      const newClient = new WebSocketClient(TEST_URL, newSessionId);
      newClient.connect();

      expect(global.WebSocket).toHaveBeenCalledWith(
        `${TEST_URL}?session_id=${newSessionId}`
      );
    });
  });

  describe('Reconnection behavior', () => {
    it('does not auto-reconnect if manually disconnected', () => {
      wsClient.connect();
      mockWs.onopen();

      wsClient.disconnect();

      expect(wsClient.reconnectAttempts).toBe(wsClient.maxReconnectAttempts);

      // Trigger close event
      mockWs.onclose({ code: 1000, reason: 'Normal closure' });

      // Should not try to reconnect
      expect(global.WebSocket).toHaveBeenCalledTimes(1);
    });

    it('reconnects after unexpected close', () => {
      vi.useFakeTimers();

      wsClient.connect();
      mockWs.onopen();

      // Simulate unexpected close
      mockWs.onclose({ code: 1006, reason: 'Abnormal closure' });

      expect(wsClient.reconnectAttempts).toBe(1);

      // Fast-forward past reconnect delay
      vi.advanceTimersByTime(1000);

      expect(global.WebSocket).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});
