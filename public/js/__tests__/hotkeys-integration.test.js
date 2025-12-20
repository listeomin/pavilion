// public/js/__tests__/hotkeys-integration.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupHotkeys } from '../hotkeys.js';
import { CommandNavigator } from '../command-navigator.js';

describe('hotkeys.js + CommandNavigator integration', () => {
  let inputEl, editor, onSubmit, navigator;

  beforeEach(() => {
    inputEl = document.createElement('div');
    inputEl.contentEditable = true;
    document.body.appendChild(inputEl);

    editor = {
      clear: vi.fn(),
      markdownText: '',
      syncMarkdownText: vi.fn(),
      saveToHistory: vi.fn()
    };

    onSubmit = vi.fn();
    navigator = new CommandNavigator(['/test', '/foo', '/bar']);
  });

  afterEach(() => {
    document.body.removeChild(inputEl);
  });

  describe('real navigation flow', () => {
    it('should cycle through commands with Alt', () => {
      inputEl.textContent = '';
      setupHotkeys(inputEl, editor, onSubmit, null, null, navigator);

      // First Alt
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true,
        cancelable: true
      }));
      expect(inputEl.textContent).toBe('/test');

      // Second Alt
      inputEl.textContent = '/test';
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true,
        cancelable: true
      }));
      expect(inputEl.textContent).toBe('/foo');

      // Third Alt
      inputEl.textContent = '/foo';
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true,
        cancelable: true
      }));
      expect(inputEl.textContent).toBe('/bar');

      // Cycle back
      inputEl.textContent = '/bar';
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true,
        cancelable: true
      }));
      expect(inputEl.textContent).toBe('/test');
    });

    it('should replace partial command text', () => {
      inputEl.textContent = '/te';
      setupHotkeys(inputEl, editor, onSubmit, null, null, navigator);

      inputEl.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true,
        cancelable: true
      }));
      
      expect(inputEl.textContent).toBe('/test');
    });

    it('should stop working after adding :', () => {
      inputEl.textContent = '/test:';
      setupHotkeys(inputEl, editor, onSubmit, null, null, navigator);

      inputEl.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true,
        cancelable: true
      }));
      
      // Should not change
      expect(inputEl.textContent).toBe('/test:');
    });
  });

  describe('does not conflict with message history', () => {
    it('should not trigger messageHistory on Alt', () => {
      const messageHistory = {
        getPrevious: vi.fn(),
        getLastForAuthor: vi.fn(),
        reset: vi.fn(),
        clearEditing: vi.fn()
      };

      inputEl.textContent = '';
      setupHotkeys(inputEl, editor, onSubmit, messageHistory, () => 'User', navigator);

      inputEl.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true,
        cancelable: true
      }));

      // MessageHistory should not be called
      expect(messageHistory.getPrevious).not.toHaveBeenCalled();
      expect(messageHistory.getLastForAuthor).not.toHaveBeenCalled();
    });

    it('should trigger messageHistory on plain Arrow (no Alt)', () => {
      const messageHistory = {
        getPrevious: vi.fn().mockReturnValue({ text: 'old msg' }),
        getLastForAuthor: vi.fn(),
        reset: vi.fn(),
        clearEditing: vi.fn()
      };

      inputEl.textContent = '';
      setupHotkeys(inputEl, editor, onSubmit, messageHistory, () => 'User', navigator);

      inputEl.dispatchEvent(new KeyboardEvent('keydown', { 
        key: 'ArrowUp', 
        altKey: false,
        bubbles: true,
        cancelable: true
      }));

      // MessageHistory should be called
      expect(messageHistory.getPrevious).toHaveBeenCalled();
    });
  });
});
