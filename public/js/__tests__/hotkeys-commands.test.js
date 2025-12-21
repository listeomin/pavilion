// public/js/__tests__/hotkeys-commands.test.js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setupHotkeys } from '../hotkeys.js';

describe('hotkeys.js - Command Navigation', () => {
  let inputEl, editor, onSubmit, navigator;

  beforeEach(() => {
    inputEl = document.createElement('div');
    inputEl.contentEditable = true;
    document.body.appendChild(inputEl);

    editor = {
      clear: vi.fn(),
      markdownText: '',
      syncMarkdownText: vi.fn()
    };

    onSubmit = vi.fn();
    
    navigator = {
      next: vi.fn(),
      prev: vi.fn(),
      reset: vi.fn()
    };
  });

  afterEach(() => {
    document.body.removeChild(inputEl);
  });

  describe('Alt key conditions', () => {
    it('should work when field is empty', () => {
      inputEl.textContent = '';
      navigator.next.mockReturnValue('/music');
      
      setupHotkeys(inputEl, editor, onSubmit, null, null, navigator);
      
      const event = new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true
      });
      inputEl.dispatchEvent(event);
      
      expect(navigator.next).toHaveBeenCalled();
    });

    it('should work when field has /command', () => {
      inputEl.textContent = '/mus';
      navigator.next.mockReturnValue('/music');
      
      setupHotkeys(inputEl, editor, onSubmit, null, null, navigator);
      
      const event = new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true
      });
      inputEl.dispatchEvent(event);
      
      expect(navigator.next).toHaveBeenCalled();
    });

    it('should NOT work when field has /command:', () => {
      inputEl.textContent = '/music:';
      navigator.next.mockReturnValue('/music');
      
      setupHotkeys(inputEl, editor, onSubmit, null, null, navigator);
      
      const event = new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true
      });
      inputEl.dispatchEvent(event);
      
      expect(navigator.next).not.toHaveBeenCalled();
    });

    it('should NOT work when field has /command: text', () => {
      inputEl.textContent = '/music: Joy Division';
      navigator.next.mockReturnValue('/music');
      
      setupHotkeys(inputEl, editor, onSubmit, null, null, navigator);
      
      const event = new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true
      });
      inputEl.dispatchEvent(event);
      
      expect(navigator.next).not.toHaveBeenCalled();
    });

    it('should NOT work when field has text without /', () => {
      inputEl.textContent = 'hello';
      navigator.next.mockReturnValue('/music');
      
      setupHotkeys(inputEl, editor, onSubmit, null, null, navigator);
      
      const event = new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true
      });
      inputEl.dispatchEvent(event);
      
      expect(navigator.next).not.toHaveBeenCalled();
    });
  });

  describe('Alt navigation', () => {
    it('should call navigator.next()', () => {
      inputEl.textContent = '';
      navigator.next.mockReturnValue('/music');
      
      setupHotkeys(inputEl, editor, onSubmit, null, null, navigator);
      
      const event = new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true
      });
      inputEl.dispatchEvent(event);
      
      expect(navigator.next).toHaveBeenCalledOnce();
    });

    it('should replace input content with command', () => {
      inputEl.textContent = '';
      navigator.next.mockReturnValue('/music');
      
      setupHotkeys(inputEl, editor, onSubmit, null, null, navigator);
      
      const event = new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true
      });
      inputEl.dispatchEvent(event);
      
      expect(inputEl.textContent).toBe('/music');
    });

    it('should update editor.markdownText', () => {
      inputEl.textContent = '';
      navigator.next.mockReturnValue('/rebase');
      
      setupHotkeys(inputEl, editor, onSubmit, null, null, navigator);
      
      const event = new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true
      });
      inputEl.dispatchEvent(event);
      
      expect(editor.markdownText).toBe('/rebase');
    });

    it('should cycle when pressing Alt multiple times', () => {
      inputEl.textContent = '';
      const commands = ['/music', '/rebase', '/music'];
      let callCount = 0;
      navigator.next.mockImplementation(() => commands[callCount++]);
      
      setupHotkeys(inputEl, editor, onSubmit, null, null, navigator);
      
      // First Alt
      let event = new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true
      });
      inputEl.dispatchEvent(event);
      expect(inputEl.textContent).toBe('/music');
      
      // Second Alt
      inputEl.textContent = '/music';
      event = new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true
      });
      inputEl.dispatchEvent(event);
      expect(inputEl.textContent).toBe('/rebase');
      
      // Third Alt (cycle)
      inputEl.textContent = '/rebase';
      event = new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true
      });
      inputEl.dispatchEvent(event);
      expect(inputEl.textContent).toBe('/music');
    });
  });

  describe('preventDefault behavior', () => {
    it('should preventDefault when Alt matches conditions', () => {
      inputEl.textContent = '';
      navigator.next.mockReturnValue('/music');
      
      setupHotkeys(inputEl, editor, onSubmit, null, null, navigator);
      
      const event = new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true,
        cancelable: true
      });
      
      const spy = vi.spyOn(event, 'preventDefault');
      inputEl.dispatchEvent(event);
      
      expect(spy).toHaveBeenCalled();
    });

    it('should NOT preventDefault when conditions not met', () => {
      inputEl.textContent = '/music:';
      navigator.next.mockReturnValue('/music');
      
      setupHotkeys(inputEl, editor, onSubmit, null, null, navigator);
      
      const event = new KeyboardEvent('keydown', { 
        key: 'Alt', 
        altKey: true,
        bubbles: true,
        cancelable: true
      });
      
      const spy = vi.spyOn(event, 'preventDefault');
      inputEl.dispatchEvent(event);
      
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('no navigator provided', () => {
    it('should not throw when navigator is null', () => {
      inputEl.textContent = '';
      
      expect(() => {
        setupHotkeys(inputEl, editor, onSubmit, null, null, null);
        
        const event = new KeyboardEvent('keydown', { 
          key: 'Alt', 
          altKey: true,
          bubbles: true
        });
        inputEl.dispatchEvent(event);
      }).not.toThrow();
    });
  });
});
