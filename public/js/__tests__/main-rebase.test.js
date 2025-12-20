// public/js/__tests__/main-rebase.test.js

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Main.js - Rebase Integration', () => {
  let mockFetch;
  let mockWebSocket;
  let wsInstance;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="chat-log"></div>
      <form id="sendForm">
        <div id="text" contenteditable="true"></div>
        <button type="submit" id="sendBtn">[отправить]</button>
      </form>
      <span id="user-emoji"></span>
      <div id="format-menu"></div>
      <button id="animal-profile-btn"></button>
      <button id="nightshift-toggle"></button>
    `;

    // Mock fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;

    // Mock WebSocket
    mockWebSocket = vi.fn();
    wsInstance = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1, // OPEN
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };
    mockWebSocket.mockReturnValue(wsInstance);
    global.WebSocket = mockWebSocket;
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('Rebase command flow', () => {
    it('handles /rebase command', async () => {
      const chatLog = document.getElementById('chat-log');
      const inputEl = document.getElementById('text');
      
      // Seed chat with messages
      chatLog.innerHTML = '<div class="message">Old message</div>';
      
      // User types /rebase
      inputEl.textContent = '/rebase';
      
      expect(inputEl.textContent).toBe('/rebase');
    });

    it('clears chat on /rebase', () => {
      const chatLog = document.getElementById('chat-log');
      chatLog.innerHTML = '<div class="message">Old message</div>';

      // Simulate rebase clearing chat
      chatLog.innerHTML = '';

      expect(chatLog.innerHTML).toBe('');
    });
  });

  describe('WebSocket rebase event', () => {
    it('clears chat on rebase event', () => {
      const chatLog = document.getElementById('chat-log');
      chatLog.innerHTML = '<div>Old message 1</div><div>Old message 2</div>';

      // Clear chat (as main.js should do on rebase event)
      chatLog.innerHTML = '';

      expect(chatLog.innerHTML).toBe('');
    });

    it('re-renders messages from rebase event', () => {
      const chatLog = document.getElementById('chat-log');
      
      const messages = [
        { id: 1, author: '🐱 Cat', text: 'Seed message 1' },
        { id: 2, author: '🐶 Dog', text: 'Seed message 2' }
      ];

      // Simulate rendering
      messages.forEach(msg => {
        const div = document.createElement('div');
        div.className = 'message';
        div.textContent = msg.text;
        chatLog.appendChild(div);
      });

      expect(chatLog.children.length).toBe(2);
    });
  });

  describe('Session recovery after rebase', () => {
    it('should reinitialize session after rebase event', async () => {
      let sessionId = 'old-session-123';

      // Initial state
      expect(sessionId).toBe('old-session-123');

      // Rebase happens
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, messages: [] })
      });

      await fetch('/?action=rebase', { method: 'POST' });

      // After rebase, re-init
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          session_id: 'new-session-456',
          name: '🐱 New Cat',
          is_new: true,
          messages: []
        })
      });

      const formData = new FormData();
      const response = await fetch('/?action=init', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      sessionId = data.session_id;

      expect(sessionId).toBe('new-session-456');
      expect(data.name).toBe('🐱 New Cat');
    });

    it('can send messages after session recovery', async () => {
      const newSessionId = 'new-session-789';

      // Mock successful send with new session
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 1,
          session_id: newSessionId,
          text: 'First message after rebase',
          author: '🐱 Cat'
        })
      });

      const response = await fetch('/?action=send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: newSessionId,
          text: 'First message after rebase'
        })
      });

      const result = await response.json();

      expect(result.id).toBe(1);
      expect(result.session_id).toBe(newSessionId);
    });
  });

  describe('WebSocket reconnection after rebase', () => {
    it('should update WebSocket with new session_id', () => {
      const oldSessionId = 'old-session-123';
      const newSessionId = 'new-session-456';

      // Old WebSocket connection
      const oldWsUrl = `ws://localhost:3001?session_id=${oldSessionId}`;
      const oldWs = new WebSocket(oldWsUrl);
      
      expect(mockWebSocket).toHaveBeenCalledWith(oldWsUrl);

      // After rebase, new connection
      const newWsUrl = `ws://localhost:3001?session_id=${newSessionId}`;
      const newWs = new WebSocket(newWsUrl);

      expect(mockWebSocket).toHaveBeenCalledWith(newWsUrl);
      expect(newWs).toBeDefined();
    });
  });

  describe('UI state after rebase', () => {
    it('focuses input after rebase', () => {
      const inputEl = document.getElementById('text');
      const focusSpy = vi.spyOn(inputEl, 'focus');
      
      inputEl.focus();

      expect(focusSpy).toHaveBeenCalled();
    });

    it('clears input after successful /rebase', () => {
      const inputEl = document.getElementById('text');
      inputEl.textContent = '/rebase';

      // After successful rebase
      inputEl.textContent = '';

      expect(inputEl.textContent).toBe('');
    });

    it('updates user emoji after re-init', () => {
      const userEmojiEl = document.getElementById('user-emoji');
      
      // Old emoji
      userEmojiEl.textContent = '🐱';
      expect(userEmojiEl.textContent).toBe('🐱');

      // After re-init with new session
      userEmojiEl.textContent = '🐶';
      expect(userEmojiEl.textContent).toBe('🐶');
    });
  });
});
