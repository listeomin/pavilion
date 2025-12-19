// public/js/__tests__/api.test.js

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  apiInit,
  apiSend,
  apiPoll,
  apiChangeName,
  apiUpdateMessage,
  setCookie,
  getCookie
} from '../api.js';

// Mock global fetch
global.fetch = vi.fn();

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: ''
});

describe('api.js', () => {
  const API = 'https://example.com/api.php';
  const COOKIE_NAME = 'test_session';

  beforeEach(() => {
    vi.clearAllMocks();
    document.cookie = '';
  });

  describe('apiInit', () => {
    it('sends session_id if provided', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ session_id: 'abc123', name: 'Test', messages: [] })
      });

      await apiInit(API, 'existing-session', COOKIE_NAME);

      expect(fetch).toHaveBeenCalledWith(
        API + '?action=init',
        expect.objectContaining({ method: 'POST' })
      );
      
      const formData = fetch.mock.calls[0][1].body;
      expect(formData.get('session_id')).toBe('existing-session');
    });

    it('returns data with messages', async () => {
      const mockResponse = {
        session_id: 'abc123',
        name: 'Test User',
        is_new: true,
        messages: [{ id: 1, text: 'Hello' }]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await apiInit(API, null, COOKIE_NAME);

      expect(result).toEqual(mockResponse);
      expect(result.messages).toHaveLength(1);
    });
  });

  describe('apiPoll', () => {
    it('forms URL with after_id parameter', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: [] })
      });

      await apiPoll(API, 42);

      expect(fetch).toHaveBeenCalledWith(
        API + '?action=poll&after_id=42',
        expect.objectContaining({ cache: 'no-store' })
      );
    });

    it('returns data with messages', async () => {
      const mockMessages = [
        { id: 43, text: 'New message 1' },
        { id: 44, text: 'New message 2' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ messages: mockMessages })
      });

      const result = await apiPoll(API, 42);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].id).toBe(43);
    });
  });

  describe('apiSend', () => {
    it('sends JSON with text and metadata', async () => {
      const metadata = { type: 'test', value: 123 };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, text: 'Hello', metadata })
      });

      await apiSend(API, 'session123', 'Hello', metadata);

      expect(fetch).toHaveBeenCalledWith(
        API + '?action=send',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: 'session123',
            text: 'Hello',
            metadata
          })
        })
      );
    });

    it('returns created message', async () => {
      const mockMessage = {
        id: 5,
        session_id: 'session123',
        author: 'Test User',
        text: 'Hello world'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMessage
      });

      const result = await apiSend(API, 'session123', 'Hello world');

      expect(result).toEqual(mockMessage);
    });
  });

  describe('apiUpdateMessage', () => {
    it('sends messageId, text, metadata', async () => {
      const metadata = { type: 'edited' };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 10, text: 'Updated', metadata })
      });

      await apiUpdateMessage(API, 'session123', 10, 'Updated', metadata);

      expect(fetch).toHaveBeenCalledWith(
        API + '?action=update_message',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: 'session123',
            message_id: 10,
            text: 'Updated',
            metadata
          })
        })
      );
    });

    it('returns updated message', async () => {
      const mockMessage = {
        id: 10,
        text: 'Updated text',
        author: 'Test User'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMessage
      });

      const result = await apiUpdateMessage(API, 'session123', 10, 'Updated text');

      expect(result).toEqual(mockMessage);
    });
  });

  describe('apiChangeName', () => {
    it('returns new name', async () => {
      const mockSession = {
        id: 'session123',
        name: '🐶 New Name',
        created_at: '2024-01-01T00:00:00Z'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSession
      });

      const result = await apiChangeName(API, 'session123');

      expect(result).toEqual(mockSession);
      expect(result.name).toBe('🐶 New Name');
    });
  });

  describe('cookies', () => {
    it('setCookie sets document.cookie', () => {
      setCookie('test', 'value123', 7);
      
      expect(document.cookie).toContain('test=value123');
    });

    it('getCookie retrieves value', () => {
      document.cookie = 'test=value123;path=/';
      
      const value = getCookie('test');
      
      expect(value).toBe('value123');
    });
  });
});
