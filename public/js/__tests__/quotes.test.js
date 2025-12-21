// public/js/__tests__/quotes.test.js

import { describe, it, expect, beforeEach } from 'vitest';
import { extractQuoteData } from '../quotes.js';

describe('quotes.js', () => {
  let inputEl;

  beforeEach(() => {
    inputEl = document.createElement('div');
    inputEl.contentEditable = true;
  });

  describe('extractQuoteData', () => {
    it('parses single quote-tag', () => {
      const quoteTag = document.createElement('span');
      quoteTag.className = 'quote-tag';
      quoteTag.dataset.messageId = '42';
      quoteTag.dataset.author = 'Alice';
      quoteTag.dataset.text = 'Original message';
      inputEl.appendChild(quoteTag);

      const result = extractQuoteData(inputEl);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        messageId: '42',
        author: 'Alice',
        text: 'Original message'
      });
    });

    it('parses multiple quote-tags', () => {
      const quote1 = document.createElement('span');
      quote1.className = 'quote-tag';
      quote1.dataset.messageId = '1';
      quote1.dataset.author = 'Alice';
      quote1.dataset.text = 'First';

      const quote2 = document.createElement('span');
      quote2.className = 'quote-tag';
      quote2.dataset.messageId = '2';
      quote2.dataset.author = 'Bob';
      quote2.dataset.text = 'Second';

      inputEl.appendChild(quote1);
      inputEl.appendChild(document.createTextNode(' '));
      inputEl.appendChild(quote2);

      const result = extractQuoteData(inputEl);

      expect(result).toHaveLength(2);
      expect(result[0].messageId).toBe('1');
      expect(result[1].messageId).toBe('2');
    });

    it('returns array with messageId, author, text', () => {
      const quoteTag = document.createElement('span');
      quoteTag.className = 'quote-tag';
      quoteTag.dataset.messageId = '100';
      quoteTag.dataset.author = 'Test User';
      quoteTag.dataset.text = 'Test message content';
      inputEl.appendChild(quoteTag);

      const result = extractQuoteData(inputEl);

      expect(result[0]).toHaveProperty('messageId');
      expect(result[0]).toHaveProperty('author');
      expect(result[0]).toHaveProperty('text');
    });

    it('returns null if no quote-tag', () => {
      inputEl.textContent = 'Just plain text';

      const result = extractQuoteData(inputEl);

      expect(result).toBeNull();
    });

    it('handles quote-tag without messageId', () => {
      const quoteTag = document.createElement('span');
      quoteTag.className = 'quote-tag';
      quoteTag.dataset.author = 'Alice';
      quoteTag.dataset.text = 'Text only';
      inputEl.appendChild(quoteTag);

      const result = extractQuoteData(inputEl);

      expect(result).toHaveLength(1);
      expect(result[0].messageId).toBeNull();
      expect(result[0].author).toBe('Alice');
    });

    it('handles escaped characters in text', () => {
      const quoteTag = document.createElement('span');
      quoteTag.className = 'quote-tag';
      quoteTag.dataset.messageId = '1';
      quoteTag.dataset.author = 'Alice';
      quoteTag.dataset.text = 'Text with <html> & "quotes"';
      inputEl.appendChild(quoteTag);

      const result = extractQuoteData(inputEl);

      expect(result[0].text).toBe('Text with <html> & "quotes"');
    });
  });
});
