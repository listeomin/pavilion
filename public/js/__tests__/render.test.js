// public/js/__tests__/render.test.js

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderMessages, updateMessage, renderSystemMessage } from '../render.js';

// Mock dependencies
vi.mock('../markdown.js', () => ({
  escapeHtml: (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'),
  parseMarkdown: (text) => text,
  linkifyImages: (text) => text
}));

vi.mock('../github.js', () => ({
  renderGitHubPreview: (metadata) => `<div>GitHub: ${metadata.url}</div>`
}));

vi.mock('../pinterest.js', () => ({
  renderPinterestPreview: (metadata) => `<div>Pinterest: ${metadata.url}</div>`
}));

vi.mock('../link.js', () => ({
  renderLinkPreview: (metadata) => `<div>Link: ${metadata.url}</div>`
}));

vi.mock('../music.js', () => ({
  renderMusicPlayer: (metadata) => `<div>Music: ${metadata.artist} - ${metadata.track}</div>`
}));

describe('render.js', () => {
  let chatLog;
  let lastIdRef;

  beforeEach(() => {
    chatLog = document.createElement('div');
    lastIdRef = { value: 0 };
  });

  describe('renderMessages', () => {
    it('updates lastIdRef to maximum ID', () => {
      const messages = [
        { id: 5, author: 'Alice', text: 'First' },
        { id: 8, author: 'Bob', text: 'Second' },
        { id: 3, author: 'Alice', text: 'Third' }
      ];

      renderMessages(chatLog, messages, lastIdRef);

      expect(lastIdRef.value).toBe(8);
    });

    it('merges sequential messages from same author', () => {
      const messages = [
        { id: 1, author: 'Alice', text: 'Message 1' },
        { id: 2, author: 'Alice', text: 'Message 2' },
        { id: 3, author: 'Bob', text: 'Message 3' }
      ];

      renderMessages(chatLog, messages, lastIdRef);

      const metaElements = chatLog.querySelectorAll('.meta');
      expect(metaElements.length).toBe(2); // Alice once, Bob once
    });

    it('does not duplicate existing messages', () => {
      const messages1 = [
        { id: 1, author: 'Alice', text: 'Message 1' }
      ];
      const messages2 = [
        { id: 2, author: 'Bob', text: 'Message 2' }
      ];

      renderMessages(chatLog, messages1, lastIdRef);
      const initialCount = chatLog.querySelectorAll('.msg').length;

      renderMessages(chatLog, messages2, lastIdRef);
      const finalCount = chatLog.querySelectorAll('.msg').length;

      // Should add message 2
      expect(finalCount).toBe(2);
    });

    it('renders quote blocks with data-quote-id', () => {
      const messages = [{
        id: 1,
        author: 'Alice',
        text: 'Reply',
        metadata: {
          quotes: [{
            messageId: 42,
            author: 'Bob',
            text: 'Original message'
          }]
        }
      }];

      renderMessages(chatLog, messages, lastIdRef);

      const quoteAuthor = chatLog.querySelector('[data-target-message]');
      expect(quoteAuthor).toBeTruthy();
      expect(quoteAuthor.dataset.targetMessage).toBe('42');
    });

    it('escapes HTML in quote text', () => {
      const messages = [{
        id: 1,
        author: 'Alice',
        text: 'Reply',
        metadata: {
          quotes: [{
            messageId: 42,
            author: 'Bob',
            text: '<script>alert("xss")</script>'
          }]
        }
      }];

      renderMessages(chatLog, messages, lastIdRef);

      const quoteText = chatLog.querySelector('.quote-text');
      
      // Проверяем что текст присутствует, но не как <script> тег
      expect(quoteText).toBeTruthy();
      expect(quoteText.querySelector('script')).toBeNull();
    });
  });

  describe('updateMessage', () => {
    it('finds element by data-message-id', () => {
      const existingMsg = document.createElement('div');
      existingMsg.className = 'msg';
      existingMsg.dataset.messageId = '10';
      existingMsg.innerHTML = '<span class="meta">Alice:</span><span>Original</span>';
      chatLog.appendChild(existingMsg);

      const updatedMessage = {
        id: 10,
        author: 'Alice',
        text: 'Updated text'
      };

      updateMessage(chatLog, updatedMessage);

      expect(existingMsg.textContent).toContain('Updated text');
      expect(existingMsg.textContent).toContain('ред.');
    });

    it('updates message content', () => {
      const existingMsg = document.createElement('div');
      existingMsg.className = 'msg';
      existingMsg.dataset.messageId = '10';
      existingMsg.innerHTML = '<span class="meta">Alice:</span><span>Original</span>';
      chatLog.appendChild(existingMsg);

      const updatedMessage = {
        id: 10,
        author: 'Alice',
        text: 'New content here'
      };

      updateMessage(chatLog, updatedMessage);

      const textSpan = existingMsg.querySelector('span:not(.meta)');
      expect(textSpan.textContent).toContain('New content here');
    });
  });

  describe('renderSystemMessage', () => {
    it('creates element with system class', () => {
      const result = renderSystemMessage(chatLog, 'Test system message');

      expect(result.classList.contains('system-msg')).toBe(true);
      expect(chatLog.contains(result)).toBe(true);
    });

    it('adds spinner if loading option is true', () => {
      const result = renderSystemMessage(chatLog, 'Loading', { spinner: true });

      const spinnerEl = result.querySelector('.system-spinner');
      expect(spinnerEl).toBeTruthy();
    });

    it('adds action button if provided', () => {
      const onClick = vi.fn();
      const result = renderSystemMessage(chatLog, 'Error occurred', {
        actionButton: {
          text: 'Retry',
          onClick
        }
      });

      const button = result.querySelector('.system-action-btn');
      expect(button).toBeTruthy();
      expect(button.textContent).toBe('Retry');
      
      button.click();
      expect(onClick).toHaveBeenCalled();
    });
  });
});
