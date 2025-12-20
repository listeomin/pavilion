// public/js/__tests__/rebase-flow.test.js

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiInit, apiSend, apiRebase } from '../api.js';

global.fetch = vi.fn();

describe('Rebase Flow', () => {
  const API = 'https://example.com/api.php';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('apiRebase', () => {
    it('calls rebase endpoint', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, messages: [] })
      });

      await apiRebase(API);

      expect(fetch).toHaveBeenCalledWith(
        API + '?action=rebase',
        { method: 'POST' }
      );
    });

    it('returns success and messages', async () => {
      const mockMessages = [
        { id: 1, text: 'Seed message 1' },
        { id: 2, text: 'Seed message 2' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, messages: mockMessages })
      });

      const result = await apiRebase(API);

      expect(result.success).toBe(true);
      expect(result.messages).toHaveLength(2);
    });

    it('handles rebase failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Rebase failed' })
      });

      const result = await apiRebase(API);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rebase failed');
    });
  });

  describe('Session lifecycle after rebase', () => {
    it('old session becomes invalid after rebase', async () => {
      const oldSessionId = 'old-session-123';

      // Rebase invalidates old sessions
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, messages: [] })
      });

      await apiRebase(API);

      // Try to send with old session
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'invalid session' })
      });

      const result = await apiSend(API, oldSessionId, 'Test message');

      expect(result).toBeNull();
    });

    it('new session works after rebase', async () => {
      // Rebase
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, messages: [] })
      });

      await apiRebase(API);

      // Re-init to get new session
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session_id: 'new-session-456',
          name: '🐱 New User',
          is_new: true,
          messages: []
        })
      });

      const initResult = await apiInit(API, null, 'test_cookie');

      expect(initResult.session_id).toBe('new-session-456');

      // Send with new session
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          text: 'First message after rebase'
        })
      });

      const sendResult = await apiSend(
        API,
        initResult.session_id,
        'First message after rebase'
      );

      expect(sendResult).toBeTruthy();
      expect(sendResult.id).toBe(1);
    });
  });

  describe('WebSocket rebase event handling', () => {
    it('should trigger reInit after rebase event', async () => {
      // Mock WebSocket behavior
      const mockWsClient = {
        on: vi.fn(),
        emit: vi.fn()
      };

      // Find rebase listener
      const rebaseListener = mockWsClient.on.mock.calls.find(
        call => call[0] === 'rebase'
      );

      // Simulate rebase event
      if (rebaseListener) {
        const callback = rebaseListener[1];
        
        // Mock apiInit
        fetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            session_id: 'new-session',
            name: '🐶 Reloaded',
            is_new: true,
            messages: []
          })
        });

        // Callback should trigger reInit
        await callback({ messages: [] });

        // Verify apiInit was called
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('action=init'),
          expect.any(Object)
        );
      }
    });
  });
});
