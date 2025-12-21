// public/js/__tests__/command-navigator.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { CommandNavigator } from '../command-navigator.js';

describe('CommandNavigator', () => {
  let navigator;

  beforeEach(() => {
    navigator = new CommandNavigator();
  });

  describe('initialization', () => {
    it('should have default commands', () => {
      expect(navigator.commands).toEqual(['/music', '/rebase']);
    });

    it('should start with no current command', () => {
      expect(navigator.getCurrentCommand()).toBeNull();
    });
  });

  describe('next()', () => {
    it('should cycle through commands forward', () => {
      expect(navigator.next()).toBe('/music');
      expect(navigator.next()).toBe('/rebase');
      expect(navigator.next()).toBe('/music'); // cycle
    });

    it('should maintain position across multiple calls', () => {
      navigator.next();
      navigator.next();
      expect(navigator.getCurrentCommand()).toBe('/rebase');
    });
  });

  describe('prev()', () => {
    it('should cycle through commands backward', () => {
      expect(navigator.prev()).toBe('/rebase');
      expect(navigator.prev()).toBe('/music');
      expect(navigator.prev()).toBe('/rebase'); // cycle
    });

    it('should maintain position across multiple calls', () => {
      navigator.prev();
      navigator.prev();
      expect(navigator.getCurrentCommand()).toBe('/music');
    });
  });

  describe('mixed navigation', () => {
    it('should handle next then prev', () => {
      navigator.next(); // /music
      expect(navigator.prev()).toBe('/rebase');
    });

    it('should handle prev then next', () => {
      navigator.prev(); // /rebase
      expect(navigator.next()).toBe('/music');
    });
  });

  describe('reset()', () => {
    it('should clear current position', () => {
      navigator.next();
      navigator.reset();
      expect(navigator.getCurrentCommand()).toBeNull();
    });

    it('should allow navigation after reset', () => {
      navigator.next();
      navigator.reset();
      expect(navigator.next()).toBe('/music');
    });
  });

  describe('custom commands', () => {
    it('should accept custom command list', () => {
      const custom = new CommandNavigator(['/test', '/foo', '/bar']);
      expect(custom.commands).toEqual(['/test', '/foo', '/bar']);
    });

    it('should cycle through custom commands', () => {
      const custom = new CommandNavigator(['/a', '/b']);
      expect(custom.next()).toBe('/a');
      expect(custom.next()).toBe('/b');
      expect(custom.next()).toBe('/a');
    });
  });

  describe('edge cases', () => {
    it('should handle single command', () => {
      const single = new CommandNavigator(['/only']);
      expect(single.next()).toBe('/only');
      expect(single.next()).toBe('/only');
    });

    it('should handle empty command list', () => {
      const empty = new CommandNavigator([]);
      expect(empty.next()).toBeNull();
      expect(empty.prev()).toBeNull();
    });
  });
});
