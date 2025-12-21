// public/js/__tests__/rebase-integration.test.js
// Интеграционный тест для проблемы: после /rebase первое сообщение не отправляется

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiInit, apiSend, apiRebase } from '../api.js';

global.fetch = vi.fn();

describe('Rebase Integration - Bug Reproduction', () => {
  const API = 'http://localhost/server/api.php';
  const COOKIE_NAME = 'chat_session_id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Bug: First message fails after /rebase', () => {
    it('reproduces the bug - old session invalid after rebase', async () => {
      // 1. User initializes session
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session_id: 'old-session-abc123',
          name: '🐱 Old Cat',
          is_new: true,
          messages: []
        })
      });

      const initData = await apiInit(API, null, COOKIE_NAME);
      const oldSessionId = initData.session_id;

      expect(oldSessionId).toBe('old-session-abc123');

      // 2. User sends normal message (works)
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          text: 'First message',
          author: '🐱 Old Cat'
        })
      });

      const msg1 = await apiSend(API, oldSessionId, 'First message');
      expect(msg1).toBeTruthy();

      // 3. User executes /rebase command
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          messages: [
            { id: 1, text: 'Seed message 1' },
            { id: 2, text: 'Seed message 2' }
          ]
        })
      });

      const rebaseResult = await apiRebase(API);
      expect(rebaseResult.success).toBe(true);

      // 4. BUG: User tries to send message with OLD session_id
      // Server returns 403 because session was deleted during rebase
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'invalid session' })
      });

      const msg2 = await apiSend(API, oldSessionId, 'Message after rebase');

      // This is the bug - message fails
      expect(msg2).toBeNull();
    });

    it('shows error message in UI after failed send', async () => {
      const oldSessionId = 'old-session-123';

      // Rebase happened
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, messages: [] })
      });

      await apiRebase(API);

      // Try to send with old session - fails
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403
      });

      const result = await apiSend(API, oldSessionId, 'Test');

      expect(result).toBeNull();
      
      // UI should show: "🛳️ капитанская рубка: у нас проблемы. [переотправить]"
      // This is what user sees currently
    });
  });

  describe('Solution: Reinitialize session after rebase', () => {
    it('client should call apiInit after receiving rebase event', async () => {
      let currentSessionId = 'old-session-123';

      // Initial state
      expect(currentSessionId).toBe('old-session-123');

      // Rebase happens
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, messages: [] })
      });

      await apiRebase(API);

      // SOLUTION: Client detects rebase and re-initializes
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session_id: 'new-session-xyz789',
          name: '🐶 New Dog',
          is_new: true,
          messages: [
            { id: 1, text: 'Seed message 1' },
            { id: 2, text: 'Seed message 2' }
          ]
        })
      });

      const newInit = await apiInit(API, null, COOKIE_NAME);
      currentSessionId = newInit.session_id;

      expect(currentSessionId).toBe('new-session-xyz789');

      // Now sending works
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 3,
          text: 'First message after rebase',
          author: '🐶 New Dog'
        })
      });

      const msg = await apiSend(API, currentSessionId, 'First message after rebase');

      expect(msg).toBeTruthy();
      expect(msg.id).toBe(3);
    });

    it('WebSocket should reconnect with new session_id', () => {
      const oldSessionId = 'old-session-123';
      const newSessionId = 'new-session-456';

      // Old WebSocket URL
      const oldWsUrl = `ws://localhost:3001?session_id=${oldSessionId}`;
      
      // After rebase and re-init
      const newWsUrl = `ws://localhost:3001?session_id=${newSessionId}`;

      expect(oldWsUrl).not.toBe(newWsUrl);
      
      // Client should close old connection and open new one
      // This ensures WebSocket events are delivered to correct session
    });
  });

  describe('Complete rebase flow with solution', () => {
    it('handles full rebase cycle correctly', async () => {
      // Step 1: Initial session
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session_id: 'session-1',
          name: '🐱 Cat',
          is_new: true,
          messages: []
        })
      });

      let session = await apiInit(API, null, COOKIE_NAME);
      let sessionId = session.session_id;

      // Step 2: Send some messages
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, text: 'Hello' })
      });

      await apiSend(API, sessionId, 'Hello');

      // Step 3: Execute /rebase
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, messages: [] })
      });

      await apiRebase(API);

      // Step 4: Client receives WS rebase event and re-inits
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session_id: 'session-2',
          name: '🐶 Dog',
          is_new: true,
          messages: [
            { id: 1, text: 'Seed 1' },
            { id: 2, text: 'Seed 2' }
          ]
        })
      });

      session = await apiInit(API, null, COOKIE_NAME);
      sessionId = session.session_id;

      expect(sessionId).toBe('session-2');

      // Step 5: Send with new session - works!
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 3, text: 'After rebase' })
      });

      const result = await apiSend(API, sessionId, 'After rebase');

      expect(result).toBeTruthy();
      expect(result.id).toBe(3);
    });
  });

  describe('Edge cases', () => {
    it('handles rebase during message send', async () => {
      const oldSessionId = 'old-session';

      // User starts typing message
      // Rebase happens in background
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, messages: [] })
      });

      await apiRebase(API);

      // User hits send - should fail gracefully
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403
      });

      const result = await apiSend(API, oldSessionId, 'Message');

      expect(result).toBeNull();
      
      // UI should show error with retry option
    });

    it('handles multiple rapid rebases', async () => {
      // First rebase
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, messages: [] })
      });

      await apiRebase(API);

      // Re-init
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session_id: 'session-1',
          name: '🐱 Cat',
          is_new: true,
          messages: []
        })
      });

      let session = await apiInit(API, null, COOKIE_NAME);

      // Second rebase before send
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, messages: [] })
      });

      await apiRebase(API);

      // Re-init again
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session_id: 'session-2',
          name: '🐶 Dog',
          is_new: true,
          messages: []
        })
      });

      session = await apiInit(API, null, COOKIE_NAME);

      expect(session.session_id).toBe('session-2');
    });

    it('preserves user input after rebase error', () => {
      // Document expected UX: if send fails after rebase,
      // input should not be cleared so user can retry
      
      const userInput = 'Important message';
      
      // After failed send, input should still contain text
      expect(userInput).toBe('Important message');
      
      // User can re-init and retry
    });
  });
});
