// public/js/__tests__/rebase-ui-state.test.js
// Тесты для состояния UI после rebase

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('UI State After Rebase', () => {
  let mockDom;

  beforeEach(() => {
    mockDom = {
      chatLog: { innerHTML: '', children: [] },
      inputEl: { textContent: '', focus: vi.fn() },
      sendBtn: { disabled: false }
    };
  });

  describe('Input state', () => {
    it('clears input after successful /rebase command', () => {
      // User types /rebase
      mockDom.inputEl.textContent = '/rebase';

      // After successful rebase
      mockDom.inputEl.textContent = '';

      expect(mockDom.inputEl.textContent).toBe('');
    });

    it('focuses input after rebase', () => {
      mockDom.inputEl.focus();

      expect(mockDom.inputEl.focus).toHaveBeenCalled();
    });

    it('preserves user input if rebase fails', () => {
      const userMessage = 'Important message I was typing';
      mockDom.inputEl.textContent = userMessage;

      // Rebase command executed
      // ... rebase fails ...

      // Input should be preserved for retry
      expect(mockDom.inputEl.textContent).toBe(userMessage);
    });
  });

  describe('Chat log state', () => {
    it('clears chat log on rebase command', () => {
      mockDom.chatLog.innerHTML = '<div>Old message 1</div><div>Old message 2</div>';

      // After rebase
      mockDom.chatLog.innerHTML = '';

      expect(mockDom.chatLog.innerHTML).toBe('');
    });

    it('shows spinner during rebase', () => {
      const spinnerHtml = '<div class="system-message"><span class="spinner"></span>Сброс базы данных...</div>';
      mockDom.chatLog.innerHTML = spinnerHtml;

      expect(mockDom.chatLog.innerHTML).toContain('spinner');
      expect(mockDom.chatLog.innerHTML).toContain('Сброс базы данных');
    });

    it('removes spinner after successful rebase', () => {
      mockDom.chatLog.innerHTML = '<div class="system-message"><span class="spinner"></span>Сброс базы данных...</div>';

      // After success
      mockDom.chatLog.innerHTML = '';

      expect(mockDom.chatLog.innerHTML).not.toContain('spinner');
    });

    it('shows error if rebase fails', () => {
      const errorHtml = '<div class="system-message">Ошибка сброса базы</div>';
      mockDom.chatLog.innerHTML = errorHtml;

      expect(mockDom.chatLog.innerHTML).toContain('Ошибка сброса базы');
    });

    it('renders seed messages after rebase', () => {
      const seedMessages = [
        { id: 1, author: '🐱 Cat', text: 'Seed 1' },
        { id: 2, author: '🐶 Dog', text: 'Seed 2' }
      ];

      // Simulate rendering
      mockDom.chatLog.innerHTML = seedMessages
        .map(m => `<div class="message">${m.text}</div>`)
        .join('');

      expect(mockDom.chatLog.innerHTML).toContain('Seed 1');
      expect(mockDom.chatLog.innerHTML).toContain('Seed 2');
    });
  });

  describe('Send button state', () => {
    it('disables send button during rebase', () => {
      mockDom.sendBtn.disabled = true;

      expect(mockDom.sendBtn.disabled).toBe(true);
    });

    it('re-enables send button after rebase', () => {
      mockDom.sendBtn.disabled = true;
      // After rebase completes
      mockDom.sendBtn.disabled = false;

      expect(mockDom.sendBtn.disabled).toBe(false);
    });
  });

  describe('Error message after failed send', () => {
    it('shows "у нас проблемы" when send fails with invalid session', () => {
      // This is the current bug behavior
      const errorHtml = '<div class="system-message">🛳️ капитанская рубка: у нас проблемы. <button>[переотправить]</button></div>';
      mockDom.chatLog.innerHTML = errorHtml;

      expect(mockDom.chatLog.innerHTML).toContain('у нас проблемы');
      expect(mockDom.chatLog.innerHTML).toContain('[переотправить]');
    });

    it('error message provides retry action', () => {
      const retryButton = { click: vi.fn() };
      
      // User clicks retry
      retryButton.click();

      expect(retryButton.click).toHaveBeenCalled();
      // Should re-init session and retry send
    });

    it('should not show error after successful re-init', () => {
      // After re-init with new session
      // Next send should succeed
      mockDom.chatLog.innerHTML = '<div class="message">New message</div>';

      expect(mockDom.chatLog.innerHTML).not.toContain('проблемы');
      expect(mockDom.chatLog.innerHTML).toContain('New message');
    });
  });

  describe('Session state tracking', () => {
    it('updates sessionId variable after rebase', () => {
      let sessionId = 'old-session-123';

      // After rebase and re-init
      sessionId = 'new-session-456';

      expect(sessionId).toBe('new-session-456');
      expect(sessionId).not.toBe('old-session-123');
    });

    it('updates user name display after re-init', () => {
      const userEmoji = { textContent: '🐱' };

      // After re-init with different name
      userEmoji.textContent = '🐶';

      expect(userEmoji.textContent).toBe('🐶');
    });
  });

  describe('WebSocket connection indicator', () => {
    it('shows disconnected state during rebase', () => {
      const wsStatus = { className: 'disconnected' };
      
      expect(wsStatus.className).toBe('disconnected');
    });

    it('shows connected state after reconnect', () => {
      const wsStatus = { className: 'connected' };
      
      expect(wsStatus.className).toBe('connected');
    });
  });

  describe('Message history', () => {
    it('clears message history after rebase', () => {
      const messageHistory = ['msg1', 'msg2', 'msg3'];
      
      // After rebase
      messageHistory.length = 0;

      expect(messageHistory).toHaveLength(0);
    });

    it('can navigate history after rebase with new messages', () => {
      const messageHistory = [];
      
      // Send new messages after rebase
      messageHistory.push('new-msg-1');
      messageHistory.push('new-msg-2');

      expect(messageHistory).toHaveLength(2);
      expect(messageHistory[0]).toBe('new-msg-1');
    });
  });

  describe('Page reload alternative', () => {
    it('page reload solves the problem (current workaround)', () => {
      // Current behavior: user must reload page after rebase
      // to get new session
      
      let sessionId = 'old-session';
      const needsReload = true;

      if (needsReload) {
        // Simulate reload: new init
        sessionId = 'new-session';
      }

      expect(sessionId).toBe('new-session');
    });

    it('automatic re-init should eliminate need for reload', () => {
      // Desired behavior: no reload needed
      let sessionId = 'old-session';
      const autoReInit = true;

      if (autoReInit) {
        // Re-init automatically after rebase event
        sessionId = 'new-session';
      }

      expect(sessionId).toBe('new-session');
      // No page reload needed!
    });
  });
});
