// public/js/__tests__/telegramAuth.test.js

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { TelegramAuth } from '../telegramAuth.js';

describe('TelegramAuth', () => {
  let telegramAuth;
  let mockContainer;

  beforeEach(() => {
    telegramAuth = new TelegramAuth();

    // Setup DOM
    document.body.innerHTML = '<div id="test-container"></div>';
    mockContainer = document.getElementById('test-container');

    // Clear globals
    delete window.testCallback;

    // Mock fetch for both API calls and script loading
    global.fetch = vi.fn((url) => {
      // Mock telegram widget script loading
      if (typeof url === 'string' && url.includes('telegram.org')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve('// mocked telegram script')
        });
      }
      // Default mock for other fetches
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('init', () => {
    it('should check auth on init', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false })
      });

      const callback = vi.fn();
      telegramAuth.init('test-container', 'test_bot', callback);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/telegram_auth.php?action=check')
      );
    });

    it('should render login button when not authenticated', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false })
      });

      telegramAuth.init('test-container', 'test_bot', vi.fn());

      await new Promise(resolve => setTimeout(resolve, 10));

      const script = mockContainer.querySelector('script');
      expect(script).toBeTruthy();
      expect(script.getAttribute('data-telegram-login')).toBe('test_bot');
    });

    it('should render my chat button when authenticated', async () => {
      const authData = {
        telegram_id: 123456789,
        telegram_username: 'john_doe'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: authData })
      });

      const callback = vi.fn();
      telegramAuth.init('test-container', 'test_bot', callback);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(callback).toHaveBeenCalledWith(authData);
      expect(mockContainer.innerHTML).toContain('john_doe');
    });
  });

  describe('checkAuth', () => {
    it('should return null on fetch error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await telegramAuth.checkAuth();

      expect(result).toBeNull();
    });

    it('should return null when not authenticated', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false })
      });

      const result = await telegramAuth.checkAuth();

      expect(result).toBeNull();
    });

    it('should return auth data when authenticated', async () => {
      const authData = {
        telegram_id: 123456789,
        telegram_username: 'john_doe'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: authData })
      });

      const result = await telegramAuth.checkAuth();

      expect(result).toEqual(authData);
    });
  });

  describe('renderLoginButton', () => {
    it('should create telegram widget script', () => {
      telegramAuth.renderLoginButton('test-container', 'test_bot');

      const script = mockContainer.querySelector('script');
      expect(script).toBeTruthy();
      expect(script.src).toContain('telegram-widget.js');
      expect(script.getAttribute('data-telegram-login')).toBe('test_bot');
      expect(script.getAttribute('data-size')).toBe('medium');
    });

    it('should not render if container not found', () => {
      telegramAuth.renderLoginButton('non-existent', 'test_bot');

      expect(mockContainer.children.length).toBe(0);
    });
  });

  describe('handleTelegramAuth', () => {
    it('should ignore events from wrong origin', async () => {
      const event = {
        origin: 'https://evil.com',
        data: { id: 123 }
      };

      await telegramAuth.handleTelegramAuth(event);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should ignore events without data', async () => {
      const event = {
        origin: 'https://oauth.telegram.org',
        data: null
      };

      await telegramAuth.handleTelegramAuth(event);

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should send auth request on valid event', async () => {
      const authData = {
        id: 123456789,
        username: 'john_doe',
        first_name: 'John'
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: authData })
      });

      const event = {
        origin: 'https://oauth.telegram.org',
        data: authData
      };

      await telegramAuth.handleTelegramAuth(event);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/telegram_auth.php?action=auth'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(authData)
        })
      );
    });
  });

  describe('renderMyChatButton', () => {
    it('should render link to telegram chat', () => {
      telegramAuth.renderMyChatButton('test-container', 'john_doe');

      const link = mockContainer.querySelector('a');
      expect(link).toBeTruthy();
      expect(link.href).toBe('https://t.me/john_doe');
      expect(link.textContent).toContain('john_doe');
    });

    it('should not render if container not found', () => {
      telegramAuth.renderMyChatButton('non-existent', 'john_doe');

      expect(mockContainer.children.length).toBe(0);
    });
  });

  describe('logout', () => {
    it('should send logout request and reload on success', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      // Mock location.reload
      const reloadMock = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true
      });

      await telegramAuth.logout();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/telegram_auth.php?action=logout'),
        expect.objectContaining({ method: 'POST' })
      );

      expect(reloadMock).toHaveBeenCalled();
    });

    it('should handle logout failure gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await telegramAuth.logout();

      // Should not throw
      expect(telegramAuth.authData).toBeDefined();
    });
  });

  describe('hideLoginButton', () => {
    it('should clear container', () => {
      mockContainer.innerHTML = '<button>Login</button>';

      telegramAuth.hideLoginButton('test-container');

      expect(mockContainer.innerHTML).toBe('');
    });

    it('should not throw if container not found', () => {
      expect(() => {
        telegramAuth.hideLoginButton('non-existent');
      }).not.toThrow();
    });
  });
});
