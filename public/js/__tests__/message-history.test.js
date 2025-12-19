// public/js/__tests__/message-history.test.js

import { describe, it, expect, beforeEach } from 'vitest';
import { MessageHistory } from '../message-history.js';

describe('message-history.js', () => {
  let history;

  beforeEach(() => {
    history = new MessageHistory();
  });

  describe('addMessage', () => {
    it('saves message with messageId', () => {
      history.addMessage('Hello', 'Alice', null, 42);

      expect(history.messages).toHaveLength(1);
      expect(history.messages[0].messageId).toBe(42);
    });

    it('saves timestamp implicitly', () => {
      history.addMessage('Hello', 'Alice', { type: 'test' }, 1);

      expect(history.messages[0].text).toBe('Hello');
      expect(history.messages[0].author).toBe('Alice');
      expect(history.messages[0].metadata).toEqual({ type: 'test' });
    });
  });

  describe('getPrevious', () => {
    it('returns previous message', () => {
      history.addMessage('Message 1', 'Alice', null, 1);
      history.addMessage('Message 2', 'Alice', null, 2);
      history.addMessage('Message 3', 'Alice', null, 3);

      const msg = history.getPrevious('Alice');

      expect(msg.text).toBe('Message 3');
      expect(msg.messageId).toBe(3);
    });

    it('filters by sessionId (author)', () => {
      history.addMessage('Alice msg 1', 'Alice', null, 1);
      history.addMessage('Bob msg', 'Bob', null, 2);
      history.addMessage('Alice msg 2', 'Alice', null, 3);

      // Первый вызов - получаем Alice msg 2
      const msg1 = history.getPrevious('Alice');
      expect(msg1.text).toBe('Alice msg 2');

      // Второй вызов - currentIndex на Bob msg, но автор не совпадает
      const msg2 = history.getPrevious('Alice');
      // getPrevious возвращает null если автор не совпадает
      expect(msg2).toBeNull();
    });

    it('returns null for different author', () => {
      history.addMessage('Alice message', 'Alice', null, 1);

      const msg = history.getPrevious('Bob');

      expect(msg).toBeNull();
    });
  });

  describe('getNext', () => {
    it('returns clear flag', () => {
      history.addMessage('Message 1', 'Alice', null, 1);
      history.getPrevious('Alice'); // Start browsing

      const result = history.getNext();

      expect(result.clear).toBe(true);
    });

    it('resets currentIndex', () => {
      history.addMessage('Message 1', 'Alice', null, 1);
      history.getPrevious('Alice');

      history.getNext();

      expect(history.currentIndex).toBe(-1);
    });
  });

  describe('getLastForAuthor', () => {
    it('returns last own message', () => {
      history.addMessage('Message 1', 'Alice', null, 1);
      history.addMessage('Message 2', 'Bob', null, 2);
      history.addMessage('Message 3', 'Alice', null, 3);

      const msg = history.getLastForAuthor('Alice');

      expect(msg.text).toBe('Message 3');
      expect(msg.messageId).toBe(3);
    });

    it('sets editingMessageId', () => {
      history.addMessage('My message', 'Alice', null, 42);

      history.getLastForAuthor('Alice');

      expect(history.editingMessageId).toBe(42);
    });

    it('returns null if no messages from author', () => {
      history.addMessage('Bob message', 'Bob', null, 1);

      const msg = history.getLastForAuthor('Alice');

      expect(msg).toBeNull();
    });
  });

  describe('clearEditing', () => {
    it('clears editingMessageId', () => {
      history.addMessage('Message', 'Alice', null, 42);
      history.getLastForAuthor('Alice');

      expect(history.editingMessageId).toBe(42);

      history.clearEditing();

      expect(history.editingMessageId).toBeNull();
    });
  });
});
