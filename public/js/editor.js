// public/js/editor.js
import { escapeHtml, parseMarkdown } from './markdown.js?v=4';

export class Editor {
  constructor(inputEl, maxHistory = 50) {
    this.inputEl = inputEl;
    this.markdownText = '';
    this.history = [''];
    this.historyIndex = 0;
    this.maxHistory = maxHistory;
    this.paused = false;
  }

  getPlainText() {
    return this.inputEl.textContent || '';
  }

  saveCursorPosition() {
    const sel = window.getSelection();
    if (sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(this.inputEl);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    return preCaretRange.toString().length;
  }

  restoreCursorPosition(pos) {
    if (pos === null) return;
    const sel = window.getSelection();
    const range = document.createRange();
    let charCount = 0;
    let nodeStack = [this.inputEl];
    let node, foundStart = false;

    while (!foundStart && (node = nodeStack.pop())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const nextCharCount = charCount + node.length;
        if (pos <= nextCharCount) {
          range.setStart(node, pos - charCount);
          range.setEnd(node, pos - charCount);
          foundStart = true;
        }
        charCount = nextCharCount;
      } else {
        for (let i = node.childNodes.length - 1; i >= 0; i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }

    if (foundStart) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  renderLiveMarkdown() {
    if (this.paused) return;
    
    const cursorPos = this.saveCursorPosition();
    const rendered = parseMarkdown(escapeHtml(this.markdownText));

    if (this.inputEl.innerHTML !== rendered) {
      this.inputEl.innerHTML = rendered;
      this.restoreCursorPosition(cursorPos);
    }
  }

  syncMarkdownText() {
    if (this.paused) return;
    
    this.markdownText = this.getPlainText();
    this.saveToHistory();
  }

  saveToHistory() {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    if (this.history[this.historyIndex] === this.markdownText) return;

    this.history.push(this.markdownText);

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.markdownText = this.history[this.historyIndex];
      this.renderLiveMarkdown();
      return true;
    }
    return false;
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.markdownText = this.history[this.historyIndex];
      this.renderLiveMarkdown();
      return true;
    }
    return false;
  }

  clear() {
    this.inputEl.innerHTML = '';
    this.markdownText = '';
    this.history = [''];
    this.historyIndex = 0;
  }

  getText() {
    return this.markdownText || '';
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.syncMarkdownText();
    this.renderLiveMarkdown();
  }
}
